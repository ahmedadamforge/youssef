import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import type { InventoryState } from './inventory-store'
import type { Item, Loan, TestRun } from './inventory-types'

export class InputError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}
export function text(value: unknown, field: string, max = 120): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new InputError(`${field}: texte requis (maximum ${max} caractères).`)
  return value.trim()
}
export function integer(value: unknown, field: string, min = 0): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > 1000000) throw new InputError(`${field}: nombre entier invalide.`)
  return value
}
export async function bodyOf(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => { throw new InputError('JSON invalide.') })
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new InputError('Objet JSON requis.')
  return body
}
export function apiError(error: unknown) {
  if (error instanceof InputError) return NextResponse.json({ error: error.message }, { status: error.status })
  console.error('Inventory storage error:', error)
  return NextResponse.json({ error: 'Stockage indisponible. Réessayez.' }, { status: 503 })
}
export function findItem(state: InventoryState, id: string) {
  const item = state.items.find(i => i.id === id)
  if (!item) throw new InputError('Matériel introuvable.', 404)
  return item
}
export function createItem(state: InventoryState, body: Record<string, unknown>) {
  const stock = integer(body.stock, 'Stock')
  const available = integer(body.available ?? stock, 'Disponible')
  if (available > stock) throw new InputError('Le disponible dépasse le stock total.')
  const id = body.id === undefined ? randomUUID() : text(body.id, 'Référence', 80)
  if (state.items.some(i => i.id === id)) throw new InputError('Cette référence existe déjà.', 409)
  const specs = body.specs ?? []
  if (!Array.isArray(specs) || specs.length > 30 || specs.some(s => typeof s !== 'string' || s.length > 200)) throw new InputError('Spécifications invalides.')
  const image = body.image === undefined ? '/inventory/arduino-uno.jpg' : text(body.image, 'Image', 255)
  if (!image.startsWith('/inventory/') && !/^https?:\/\//.test(image)) throw new InputError('URL image invalide.')
  const item: Item = { id, name: text(body.name, 'Nom', 160), category: text(body.category, 'Catégorie', 80), description: body.description ? text(body.description, 'Description', 2000) : '', stock, available, unit: text(body.unit ?? 'pièces', 'Unité', 40), image, specs: specs as string[], accent: ['cyan','mint','orange'].includes(String(body.accent)) ? String(body.accent) : 'cyan' }
  state.items.unshift(item)
  return item
}
export function createLoan(state: InventoryState, body: Record<string, unknown>) {
  const item = findItem(state, text(body.itemId, 'Matériel', 80))
  const quantity = integer(body.quantity, 'Quantité', 1)
  const memberName = text(body.memberName, 'Membre')
  const projectName = text(body.projectName, 'Projet')
  if (!['Testé OK', 'Non testé'].includes(String(body.initialState))) throw new InputError('État initial invalide.')
  if (quantity > item.available) throw new InputError('Stock disponible insuffisant.', 409)
  const loan: Loan = { id: randomUUID(), itemId: item.id, itemName: item.name, memberName, projectName, quantity, initialState: body.initialState as Loan['initialState'], loanDate: new Date().toISOString(), status: 'active' }
  item.available -= quantity
  state.loans.unshift(loan)
  return { loan, item }
}
export function returnLoan(state: InventoryState, id: string) {
  const loan = state.loans.find(l => l.id === id)
  if (!loan) throw new InputError('Emprunt introuvable.', 404)
  const item = findItem(state, loan.itemId)
  if (loan.status === 'active') {
    if (item.available + loan.quantity > item.stock) throw new InputError('Stock incohérent, vérifiez cet article.', 409)
    item.available += loan.quantity
    loan.status = 'returned'
    loan.returnedAt = new Date().toISOString()
  }
  return { success: true, loan, item }
}
export function reportFault(state: InventoryState, body: Record<string, unknown>) {
  const item = findItem(state, text(body.itemId, 'Matériel', 80))
  if (item.available < 1) throw new InputError('Aucune unité disponible à mettre en quarantaine.', 409)
  const log = { id: randomUUID(), itemId: item.id, itemName: item.name, errorDetail: text(body.errorDetail, 'Détail', 2000), reportedBy: text(body.reportedBy ?? 'Banc de test', 'Auteur'), status: 'En quarantaine', reportedAt: new Date().toISOString() }
  item.available--
  state.logs.unshift(log)
  return { log, item }
}
export function updateStock(state: InventoryState, id: string, body: Record<string, unknown>) {
  const item = findItem(state, id)
  if (body.action === 'report-fault') return reportFault(state, { ...body, itemId: id })
  let stock: number
  if (body.action === 'adjust-stock') stock = integer(item.stock + integer(body.delta, 'Ajustement', -1000000), 'Stock')
  else if (body.action === 'set-stock') stock = integer(body.stock, 'Stock')
  else throw new InputError('Action invalide. Utilisez les emprunts pour les sorties et retours.')
  const unavailable = item.stock - item.available
  if (stock < unavailable) throw new InputError('Impossible de retirer des unités empruntées ou indisponibles.', 409)
  const available = stock - unavailable
  if (body.available !== undefined && body.available !== available) throw new InputError('Le disponible est calculé à partir des prêts et des pannes.')
  item.stock = stock
  item.available = available
  return { item }
}
export function createTestRun(state: InventoryState, body: Record<string, unknown>, testedBy: string) {
  const allowed = ['passed', 'failed', 'timeout']
  const status = String(body.status)
  if (!allowed.includes(status)) throw new InputError('Statut de test invalide.')
  const measurements = body.measurements ?? {}
  if (!measurements || typeof measurements !== 'object' || Array.isArray(measurements)) throw new InputError('Mesures de test invalides.')
  const itemId = body.itemId === undefined || body.itemId === null || body.itemId === '' ? null : text(body.itemId, 'Matériel', 80)
  if (itemId) findItem(state, itemId)
  const run: TestRun = { id: randomUUID(), itemId, itemName: itemId ? findItem(state, itemId).name : undefined, testKey: text(body.testKey, 'Test', 40), testLabel: text(body.testLabel, 'Libellé', 160), command: text(body.command, 'Commande', 160), status: status as TestRun['status'], measurements: Object.fromEntries(Object.entries(measurements).slice(0, 20).map(([key, value]) => [text(key, 'Mesure', 40), text(String(value), 'Valeur', 120)])), rawResponse: body.rawResponse ? text(body.rawResponse, 'Réponse', 1000) : undefined, errorDetail: body.errorDetail ? text(body.errorDetail, 'Détail', 1000) : undefined, testedBy: text(testedBy, 'Opérateur', 120), testedAt: new Date().toISOString() }
  state.testRuns.unshift(run)
  state.testRuns = state.testRuns.slice(0, 500)
  return run
}
