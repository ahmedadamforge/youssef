import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { NextResponse } from 'next/server'
import { withAuthState } from './auth-store'
import { InputError, text } from './inventory-service'
import type { PublicUser, StoredUser, AuthState } from './auth-types'

const derive = promisify(scrypt)
export const SESSION_COOKIE = 'cmc_session'
const SESSION_SECONDS = 60 * 60 * 8
export const publicUser = (user: StoredUser): PublicUser => ({ id: user.id, name: user.name, email: user.email, role: user.role, active: user.active })
const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex')
const emailOf = (value: unknown) => {
  const email = text(value, 'Email', 254).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new InputError('Adresse email invalide.')
  return email
}
const passwordOf = (value: unknown) => {
  if (typeof value !== 'string' || value.length < 10 || value.length > 128) throw new InputError('Le mot de passe doit contenir entre 10 et 128 caractères.')
  return value
}
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const key = await derive(password, salt, 64) as Buffer
  return `${salt}:${key.toString('hex')}`
}
async function verifyPassword(password: string, encoded: string) {
  const [salt, expected] = encoded.split(':')
  const key = await derive(password, salt, 64) as Buffer
  const target = Buffer.from(expected, 'hex')
  return key.length === target.length && timingSafeEqual(key, target)
}
function newSession(state: AuthState, user: StoredUser) {
  const token = randomBytes(32).toString('hex')
  state.sessions = state.sessions.filter(session => session.expiresAt > Date.now())
  const own = state.sessions.filter(session => session.userId === user.id)
  if (own.length >= 5) state.sessions = state.sessions.filter(session => session !== own[0])
  state.sessions.push({ tokenHash: tokenHash(token), userId: user.id, expiresAt: Date.now() + SESSION_SECONDS * 1000 })
  return { user: publicUser(user), token }
}
export function requireSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin) throw new InputError('Origine de la requête refusée.', 403)
  let parsed: URL
  try { parsed = new URL(origin) } catch { throw new InputError('Origine de la requête refusée.', 403) }
  // Next.js may canonicalize request.url to localhost; the browser's Host is authoritative here.
  const host = request.headers.get('host') || new URL(request.url).host
  const protocol = request.headers.get('x-forwarded-proto')?.split(',')[0].trim() || new URL(request.url).protocol.slice(0, -1)
  if (parsed.host.toLowerCase() !== host.toLowerCase() || parsed.protocol !== `${protocol}:` || !['http:', 'https:'].includes(parsed.protocol)) throw new InputError('Origine de la requête refusée.', 403)
}
export function sessionToken(request: Request) {
  const cookie = (request.headers.get('cookie') || '').split(';').map(value => value.trim()).find(value => value.startsWith(`${SESSION_COOKIE}=`))
  return cookie?.slice(SESSION_COOKIE.length + 1) || ''
}
export async function getSessionUser(token: string): Promise<PublicUser | null> {
  if (!/^[a-f0-9]{64}$/.test(token)) return null
  return withAuthState(state => {
    const session = state.sessions.find(candidate => candidate.tokenHash === tokenHash(token) && candidate.expiresAt > Date.now())
    const user = session && state.users.find(candidate => candidate.id === session.userId && candidate.active)
    return user ? publicUser(user) : null
  })
}
export async function requireUser(request: Request, admin = false) {
  if (!['GET', 'HEAD'].includes(request.method)) requireSameOrigin(request)
  const user = await getSessionUser(sessionToken(request))
  if (!user) throw new InputError('Connectez-vous pour continuer.', 401)
  if (admin && user.role !== 'admin') throw new InputError('Cette action est réservée aux administrateurs.', 403)
  return user
}
export const hasAccounts = () => withAuthState(state => state.users.length > 0)

export async function createAccount(body: Record<string, unknown>, setup = false) {
  const email = emailOf(body.email)
  const name = text(body.name, 'Nom')
  const passwordHash = await hashPassword(passwordOf(body.password))
  if (!setup && body.role !== undefined && body.role !== 'user') throw new InputError('Le rôle administrateur ne peut pas être choisi à l’inscription.', 403)
  return withAuthState(state => {
    if (setup && state.users.length) throw new InputError('Le compte administrateur est déjà configuré.', 409)
    if (!setup && !state.users.length) throw new InputError('Configurez d’abord le compte administrateur.', 409)
    if (state.users.some(user => user.email === email)) throw new InputError('Cette adresse email est déjà utilisée.', 409)
    const user: StoredUser = { id: randomUUID(), email, name, passwordHash, role: setup ? 'admin' : 'user', active: true, createdAt: new Date().toISOString(), failedAttempts: 0, lockedUntil: 0 }
    state.users.push(user)
    return newSession(state, user)
  }, true)
}
export async function login(body: Record<string, unknown>) {
  const email = emailOf(body.email)
  if (typeof body.password !== 'string' || body.password.length > 128) throw new InputError('Email ou mot de passe incorrect.', 401)
  const password = body.password
  const result = await withAuthState(async state => {
    const user = state.users.find(candidate => candidate.email === email)
    if (user && user.lockedUntil > Date.now()) return { error: 'Trop de tentatives. Réessayez dans 15 minutes.', status: 429 }
    const valid = await verifyPassword(password, user?.passwordHash || `${'0'.repeat(32)}:${'0'.repeat(128)}`)
    if (!valid || !user?.active) {
      if (user) {
        user.failedAttempts = user.lockedUntil && user.lockedUntil <= Date.now() ? 1 : user.failedAttempts + 1
        if (user.failedAttempts >= 5) user.lockedUntil = Date.now() + 15 * 60 * 1000
      }
      return { error: 'Email ou mot de passe incorrect.', status: 401 }
    }
    user.failedAttempts = 0; user.lockedUntil = 0
    return newSession(state, user)
  }, true)
  if ('error' in result) throw new InputError(result.error, result.status)
  return result
}
export function sessionResponse(request: Request, result: { user: PublicUser; token: string }, status = 200) {
  const response = NextResponse.json({ user: result.user }, { status, headers: { 'Cache-Control': 'no-store' } })
  response.cookies.set(SESSION_COOKIE, result.token, { httpOnly: true, sameSite: 'lax', secure: new URL(request.headers.get('origin') || request.url).protocol === 'https:', path: '/', maxAge: SESSION_SECONDS })
  return response
}
export async function logout(request: Request) {
  requireSameOrigin(request)
  const token = sessionToken(request)
  if (token) await withAuthState(state => { state.sessions = state.sessions.filter(session => session.tokenHash !== tokenHash(token)) }, true)
  const response = NextResponse.json({ success: true })
  response.cookies.set(SESSION_COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0, secure: new URL(request.headers.get('origin') || request.url).protocol === 'https:' })
  return response
}
export const listUsers = () => withAuthState(state => state.users.map(publicUser))
export async function updateAccount(id: string, body: Record<string, unknown>) {
  if (body.role !== undefined && !['admin', 'user'].includes(String(body.role))) throw new InputError('Rôle invalide.')
  if (body.active !== undefined && typeof body.active !== 'boolean') throw new InputError('Statut invalide.')
  if (body.role === undefined && body.active === undefined) throw new InputError('Aucune modification fournie.')
  return withAuthState(state => {
    const user = state.users.find(candidate => candidate.id === id)
    if (!user) throw new InputError('Compte introuvable.', 404)
    const role = body.role === undefined ? user.role : body.role as PublicUser['role']
    const active = body.active === undefined ? user.active : body.active as boolean
    if (user.active && user.role === 'admin' && (!active || role !== 'admin') && state.users.filter(candidate => candidate.active && candidate.role === 'admin').length === 1) throw new InputError('Le dernier administrateur actif doit être conservé.', 409)
    user.role = role; user.active = active
    state.sessions = state.sessions.filter(session => session.userId !== user.id)
    return publicUser(user)
  }, true)
}
