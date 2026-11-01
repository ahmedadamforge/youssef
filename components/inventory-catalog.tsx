'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import inventorySeed from '@/db/inventory-seed.json'

type Category = 'All' | 'Sensors' | 'Motors' | 'Microcontrollers' | 'Drivers & Logic' | 'Power' | 'Prototyping'
type StockFilter = 'all' | 'available' | 'low'
type Item = {
  id: string
  name: string
  category: Exclude<Category, 'All'>
  description: string
  image: string
  stock: number
  available: number
  unit: string
  specs: string[]
  accent: string
}

const inventorySeedItems = inventorySeed as Item[]

const categoryOrder: Category[] = ['All', 'Sensors', 'Motors', 'Microcontrollers', 'Drivers & Logic', 'Power', 'Prototyping']
const accentClass: Record<string, string> = { cyan: 'text-cyan border-cyan/20 bg-cyan/10', orange: 'text-orange border-orange/20 bg-orange/10', mint: 'text-mint border-mint/20 bg-mint/10' }

export default function InventoryCatalog() {
  const [inventory, setInventory] = useState<Item[]>(inventorySeedItems)
  const [stockSource, setStockSource] = useState<'database' | 'local'>('local')
  const [stockMessage, setStockMessage] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string[]>([])
  const [activeCategory, setActiveCategory] = useState<Category>('All')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [query, setQuery] = useState('')
  const [borrowed, setBorrowed] = useState<string[]>([])
  const [showBorrowed, setShowBorrowed] = useState(false)

  useEffect(() => {
    let mounted = true
    fetch('/api/inventory', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('inventory database unavailable')
        return response.json() as Promise<{ items?: Item[]; source?: 'database' }>
      })
      .then((payload) => {
        if (!mounted || !payload.items?.length) return
        setInventory(payload.items)
        setStockSource('database')
        setStockMessage(null)
      })
      .catch(() => {
        if (mounted) { setStockSource('local'); setStockMessage('Database unavailable — showing the local inventory snapshot.') }
      })
    return () => { mounted = false }
  }, [])

  const categoryCounts = useMemo(() => inventory.reduce<Record<string, number>>((counts, item) => ({ ...counts, [item.category]: (counts[item.category] || 0) + 1 }), {}), [])
  const filtered = useMemo(() => inventory.filter((item) => {
    const haystack = `${item.name} ${item.id} ${item.category} ${item.description} ${item.specs.join(' ')}`.toLowerCase()
    const categoryMatch = activeCategory === 'All' || item.category === activeCategory
    const searchMatch = haystack.includes(query.toLowerCase())
    const stockMatch = stockFilter === 'all' || (stockFilter === 'available' && item.available > 0) || (stockFilter === 'low' && item.available / item.stock < 0.35)
    const borrowedMatch = !showBorrowed || borrowed.includes(item.id)
    return categoryMatch && searchMatch && stockMatch && borrowedMatch
  }), [activeCategory, borrowed, query, showBorrowed, stockFilter])

  const totalAvailable = inventory.reduce((sum, item) => sum + item.available, 0)
  const totalUnits = inventory.reduce((sum, item) => sum + item.stock, 0)
  const lowStock = inventory.filter((item) => item.available / item.stock < 0.35).length

  async function toggleBorrow(item: Item) {
    const isBorrowed = borrowed.includes(item.id)
    const action = isBorrowed ? 'release' : 'reserve'
    setStockMessage(null)
    setUpdating((current) => [...current, item.id])
    try {
      if (stockSource === 'database') {
        const response = await fetch(`/api/inventory/${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
        const payload = await response.json() as { item?: Item; error?: string }
        if (!response.ok || !payload.item) throw new Error(payload.error || 'Stock update failed')
        setInventory((current) => current.map((entry) => entry.id === item.id ? payload.item as Item : entry))
      } else {
        setInventory((current) => current.map((entry) => entry.id === item.id ? { ...entry, available: action === 'reserve' ? Math.max(0, entry.available - 1) : Math.min(entry.stock, entry.available + 1) } : entry))
      }
      setBorrowed((current) => isBorrowed ? current.filter((id) => id !== item.id) : [...current, item.id])
    } catch (error) {
      setStockMessage(error instanceof Error ? error.message : 'Stock update failed.')
    } finally {
      setUpdating((current) => current.filter((id) => id !== item.id))
    }
  }
  function resetFilters() {
    setQuery(''); setActiveCategory('All'); setStockFilter('all'); setShowBorrowed(false)
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="stat-card"><p className="eyebrow">Catalog</p><p className="mt-2 text-2xl font-medium text-white">{inventory.length}<span className="ml-2 text-xs text-muted">SKUs</span></p><p className="mt-1 text-xs text-muted">Across {categoryOrder.length - 1} families</p></div>
        <div className="stat-card"><p className="eyebrow">Available now</p><p className="mt-2 text-2xl font-medium text-mint">{totalAvailable}<span className="ml-2 text-xs text-muted">units</span></p><p className="mt-1 text-xs text-muted">of {totalUnits} tracked units</p></div>
        <div className="stat-card"><p className="eyebrow">Low stock</p><p className="mt-2 text-2xl font-medium text-orange">{lowStock}<span className="ml-2 text-xs text-muted">items</span></p><p className="mt-1 text-xs text-muted">Restock before workshops</p></div>
        <div className="stat-card"><p className="eyebrow">Your list</p><p className="mt-2 text-2xl font-medium text-cyan">{borrowed.length}<span className="ml-2 text-xs text-muted">reserved</span></p><p className="mt-1 text-xs text-muted">Ready for checkout</p></div>
      </div>

      <div className="glass-panel overflow-hidden rounded-[22px]">
        <div className="flex flex-col gap-4 border-b border-white/10 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div><p className="eyebrow">Lab inventory / 02</p><h2 className="mt-2 text-2xl font-medium tracking-[-0.035em] text-white">Every component, ready to build<span className="text-cyan">.</span></h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Search by part name, reference, specification, or category. Filter stock levels, reserve a component, and prepare your next robotics session.</p></div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/10 px-3 py-2 text-xs text-muted"><span className={`status-dot ${stockSource === 'database' ? 'status-dot-working' : 'status-dot-idle'}`} /> {stockSource === 'database' ? 'Database synced' : 'Local snapshot'} <span className="mx-1 text-white/20">/</span> {inventory.length} references</div>
        </div>
        {stockMessage && <div className="border-b border-orange/20 bg-orange/5 px-5 py-3 text-xs text-orange">{stockMessage}</div>}

        <div className="space-y-3 border-b border-white/10 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">{categoryOrder.map((category) => <button key={category} onClick={() => setActiveCategory(category)} className={`rounded-full border px-3 py-2 text-xs transition ${activeCategory === category ? 'border-cyan/40 bg-cyan/10 text-cyan' : 'border-white/10 text-muted hover:border-white/20 hover:text-fog'}`}>{category}{category !== 'All' && <span className="ml-2 text-[10px] opacity-60">{categoryCounts[category] || 0}</span>}{category === 'All' && <span className="ml-2 text-[10px] opacity-60">{inventory.length}</span>}</button>)}</div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-muted"><span className="text-sm">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search components, specs..." className="w-full bg-transparent text-fog outline-none placeholder:text-muted md:w-48" /></label>
              <button onClick={() => setShowBorrowed((value) => !value)} className={`whitespace-nowrap rounded-full border px-3 py-2 text-xs transition ${showBorrowed ? 'border-orange/40 bg-orange/10 text-orange' : 'border-white/10 text-muted hover:text-fog'}`}>My borrow list {borrowed.length ? `· ${borrowed.length}` : ''}</button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2"><span className="mr-1 text-[10px] font-semibold uppercase tracking-[.18em] text-muted">Stock</span>{([['all', 'All stock'], ['available', 'Available'], ['low', 'Low stock']] as [StockFilter, string][]).map(([value, label]) => <button key={value} onClick={() => setStockFilter(value)} className={`rounded-md border px-2.5 py-1.5 text-[11px] transition ${stockFilter === value ? 'border-mint/30 bg-mint/10 text-mint' : 'border-white/10 text-muted hover:text-fog'}`}>{label}</button>)}<span className="ml-auto text-[11px] text-muted">Showing {filtered.length} of {inventory.length}</span></div>
        </div>

        <div className="grid gap-px bg-white/10 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((item) => {
              const isBorrowed = borrowed.includes(item.id)
              const stockRatio = item.available / item.stock
              return <motion.article key={item.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: .25 }} className="group bg-[#0d2631] p-4">
                <div className="relative overflow-hidden rounded-2xl bg-white"><img src={item.image} alt={`${item.name} component`} className="h-48 w-full object-cover transition duration-500 group-hover:scale-[1.03]" /><div className="absolute left-3 top-3 flex flex-wrap gap-2"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${accentClass[item.accent]}`}>{item.category}</span>{stockRatio < .35 && <span className="rounded-full border border-orange/30 bg-[#371b12]/90 px-2.5 py-1 text-[10px] text-orange">Low stock</span>}</div><div className="absolute bottom-3 right-3 rounded-full bg-[#07161E]/85 px-2.5 py-1 font-mono text-[10px] text-fog">{item.id.toUpperCase()}</div></div>
                <div className="px-1 pt-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-base font-medium text-white">{item.name}</h3><p className="mt-1.5 min-h-[42px] text-xs leading-5 text-muted">{item.description}</p></div><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.available > 0 ? 'bg-mint shadow-[0_0_0_4px_rgba(147,229,192,.1)]' : 'bg-orange'}`} /></div><div className="mt-4 flex flex-wrap gap-1.5">{item.specs.map((spec) => <span key={spec} className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] text-muted">{spec}</span>)}</div><div className="mt-4"><div className="mb-2 flex items-center justify-between text-[11px]"><span className="text-muted">Availability</span><span className={stockRatio < .35 ? 'text-orange' : 'text-mint'}>{item.available} / {item.stock} {item.unit}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full ${stockRatio < .35 ? 'bg-orange' : 'bg-cyan'}`} style={{ width: `${stockRatio * 100}%` }} /></div></div><button onClick={() => void toggleBorrow(item)} disabled={(!isBorrowed && item.available === 0) || updating.includes(item.id)} className={`mt-4 flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-xs transition ${isBorrowed ? 'border-orange/40 bg-orange/10 text-orange' : 'border-cyan/20 bg-cyan/[0.06] text-cyan hover:border-cyan/40 hover:bg-cyan/10'} disabled:cursor-not-allowed disabled:opacity-40`}><span>{updating.includes(item.id) ? 'Updating stock…' : isBorrowed ? 'Reserved for your build' : item.available ? 'Add to borrow list' : 'Currently unavailable'}</span><span>{updating.includes(item.id) ? '…' : isBorrowed ? '✓' : '＋'}</span></button></div>
              </motion.article>
            })}
          </AnimatePresence>
        </div>
        {!filtered.length && <div className="p-12 text-center"><p className="text-sm text-fog">No components match this view.</p><button onClick={resetFilters} className="mt-3 text-xs text-cyan hover:underline">Reset filters</button></div>}
        <div className="flex flex-col gap-3 border-t border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm text-fog">Need another component?</p><p className="mt-1 text-xs text-muted">Ask the lab manager to add a reference or report a stock mismatch.</p></div><button className="rounded-xl border border-white/10 px-4 py-2.5 text-xs text-fog transition hover:border-cyan/30 hover:text-cyan">Contact inventory lead <span className="ml-2">↗</span></button></div>
      </div>
    </div>
  )
}
