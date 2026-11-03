'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Item, Loan } from '@/lib/inventory-types'

type Snapshot = { items: Item[]; loans: Loan[]; source: 'database' | 'local' }
type LoanResult = { item: Item; loan: Loan }

async function jsonResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null)
  if (response.status === 401 && typeof window !== 'undefined') window.location.replace('/login')
  if (!response.ok || !data) throw new Error(data?.error || 'Le serveur ne répond pas. Réessayez.')
  return data as T
}

const upsertItem = (items: Item[], item: Item) => items.some(current => current.id === item.id)
  ? items.map(current => current.id === item.id ? item : current)
  : [item, ...items]
const upsertLoan = (loans: Loan[], loan: Loan) => loans.some(current => current.id === loan.id)
  ? loans.map(current => current.id === loan.id ? loan : current)
  : [loan, ...loans]

export default function useInventory() {
  const [snapshot, setSnapshot] = useState<Snapshot>({ items: [], loans: [], source: 'local' })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [stockUpdatingId, setStockUpdatingId] = useState<string | null>(null)
  const activeRead = useRef<AbortController | null>(null)
  const stockWrite = useRef(false)

  const invalidateRead = useCallback(() => {
    activeRead.current?.abort()
    activeRead.current = null
  }, [])

  const refresh = useCallback(async () => {
    invalidateRead()
    const controller = new AbortController()
    activeRead.current = controller
    try {
      const response = await fetch('/api/inventory/snapshot', { cache: 'no-store', signal: controller.signal })
      const data = await jsonResponse<Snapshot>(response)
      if (!Array.isArray(data.items) || !Array.isArray(data.loans) || !['database', 'local'].includes(data.source)) throw new Error('Réponse du serveur invalide.')
      if (controller.signal.aborted) return
      setSnapshot(data)
      setLoadError(null)
    } catch (error) {
      if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : 'Chargement impossible.')
    } finally {
      if (activeRead.current === controller) {
        activeRead.current = null
        setLoading(false)
      }
    }
  }, [invalidateRead])

  useEffect(() => {
    void refresh()
    const onFocus = () => { if (!stockWrite.current && !activeRead.current) void refresh() }
    window.addEventListener('focus', onFocus)
    return () => { window.removeEventListener('focus', onFocus); invalidateRead() }
  }, [refresh, invalidateRead])

  const recordItem = useCallback((item: Item) => {
    invalidateRead()
    setSnapshot(previous => ({ ...previous, items: upsertItem(previous.items, item) }))
  }, [invalidateRead])

  const recordLoan = useCallback((loan: Loan, item: Item) => {
    invalidateRead()
    setSnapshot(previous => ({ ...previous, items: upsertItem(previous.items, item), loans: upsertLoan(previous.loans, loan) }))
  }, [invalidateRead])

  const adjustStock = useCallback(async (id: string, delta: number) => {
    // The ref guards two clicks before React has committed the disabled state.
    if (stockWrite.current) return false
    stockWrite.current = true
    setStockUpdatingId(id)
    invalidateRead()
    try {
      const result = await jsonResponse<{ item: Item }>(await fetch(`/api/inventory/${encodeURIComponent(id)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'adjust-stock', delta }),
      }))
      recordItem(result.item)
      return true
    } finally {
      stockWrite.current = false
      setStockUpdatingId(null)
    }
  }, [invalidateRead, recordItem])

  const returnLoan = useCallback(async (id: string) => {
    const result = await jsonResponse<LoanResult>(await fetch(`/api/inventory/loans/${encodeURIComponent(id)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'return' }),
    }))
    recordLoan(result.loan, result.item)
  }, [recordLoan])

  return { ...snapshot, loading, loadError, stockUpdatingId, refresh, recordItem, recordLoan, adjustStock, returnLoan }
}
