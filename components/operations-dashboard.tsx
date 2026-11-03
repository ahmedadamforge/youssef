'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import type { Item, Loan } from '@/lib/inventory-types'
import useInventory from './use-inventory'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(new Date(value))
}

function StatCard({ label, value, detail, tone = 'cyan' }: { label: string; value: number; detail: string; tone?: 'cyan' | 'orange' | 'mint' | 'fog' }) {
  const tones = {
    cyan: 'border-cyan/30 bg-cyan/10 text-cyan',
    orange: 'border-orange/30 bg-orange/10 text-orange',
    mint: 'border-mint/30 bg-mint/10 text-mint',
    fog: 'border-white/15 bg-white/5 text-fog',
  }
  return <article className={`rounded-xl border p-5 ${tones[tone]}`}>
    <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
    <p className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-fog">{value}</p>
    <p className="mt-2 text-sm text-muted">{detail}</p>
  </article>
}

function StockAttention({ items }: { items: Item[] }) {
  const attention = useMemo(() => items
    .filter(item => item.available === 0 || item.available <= Math.max(2, Math.ceil(item.stock * 0.25)))
    .sort((a, b) => a.available - b.available)
    .slice(0, 5), [items])

  return <section className="rounded-xl border border-white/10 bg-surface/80 p-5">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-orange">À surveiller</p>
        <h2 className="mt-2 text-xl font-semibold text-fog">Stock critique</h2>
      </div>
      <Link href="/?stock=low" className="text-sm text-cyan hover:text-fog">Voir le catalogue →</Link>
    </div>
    {attention.length ? <div className="mt-5 divide-y divide-white/10">
      {attention.map(item => <div key={item.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
        <div className="min-w-0"><p className="truncate font-medium text-fog">{item.name}</p><p className="mt-1 text-xs text-muted">{item.category}</p></div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${item.available === 0 ? 'bg-orange/15 text-orange' : 'bg-white/10 text-fog'}`}>{item.available}/{item.stock} dispo.</span>
      </div>)}
    </div> : <p className="mt-6 rounded-lg border border-mint/20 bg-mint/5 p-4 text-sm text-mint">Aucun stock critique détecté.</p>}
  </section>
}

function RecentLoans({ loans, items }: { loans: Loan[]; items: Item[] }) {
  const itemNames = useMemo(() => new Map(items.map(item => [item.id, item.name])), [items])
  const recent = loans.slice().sort((a, b) => new Date(b.loanDate).getTime() - new Date(a.loanDate).getTime()).slice(0, 6)

  return <section className="rounded-xl border border-white/10 bg-surface/80 p-5">
    <div className="flex items-start justify-between gap-4">
      <div><p className="text-xs uppercase tracking-[0.16em] text-cyan">Mouvements</p><h2 className="mt-2 text-xl font-semibold text-fog">Activité récente</h2></div>
      <Link href="/?tab=loans" className="text-sm text-cyan hover:text-fog">Gérer les emprunts →</Link>
    </div>
    {recent.length ? <div className="mt-5 divide-y divide-white/10">
      {recent.map(loan => <div key={loan.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
        <div className="min-w-0"><p className="truncate font-medium text-fog">{itemNames.get(loan.itemId) || loan.itemName || 'Matériel'}</p><p className="mt-1 truncate text-xs text-muted">{loan.memberName} · {loan.projectName || 'Sans projet'}</p></div>
        <div className="shrink-0 text-right"><span className={`rounded-full px-2.5 py-1 text-xs ${loan.status === 'active' ? 'bg-cyan/10 text-cyan' : 'bg-white/10 text-muted'}`}>{loan.status === 'active' ? 'Actif' : 'Retourné'}</span><p className="mt-2 text-xs text-muted">{formatDate(loan.loanDate)}</p></div>
      </div>)}
    </div> : <p className="mt-6 text-sm text-muted">Aucun mouvement enregistré pour le moment.</p>}
  </section>
}

function CategoryBreakdown({ items }: { items: Item[] }) {
  const categories = useMemo(() => {
    const counts = new Map<string, number>()
    items.forEach(item => counts.set(item.category, (counts.get(item.category) || 0) + item.stock))
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [items])
  const maximum = categories[0]?.[1] || 1

  return <section className="rounded-xl border border-white/10 bg-surface/80 p-5">
    <p className="text-xs uppercase tracking-[0.16em] text-muted">Répartition</p>
    <h2 className="mt-2 text-xl font-semibold text-fog">Matériel par catégorie</h2>
    <div className="mt-6 space-y-4">
      {categories.map(([category, count]) => <div key={category}>
        <div className="mb-2 flex justify-between gap-4 text-sm"><span className="truncate text-fog">{category}</span><span className="text-muted">{count} unités</span></div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan" style={{ width: `${Math.max(8, count / maximum * 100)}%` }} /></div>
      </div>)}
      {!categories.length && <p className="text-sm text-muted">Ajoutez du matériel pour voir la répartition.</p>}
    </div>
  </section>
}

export default function OperationsDashboard() {
  const { items, loans, loading, loadError, refresh } = useInventory()
  const metrics = useMemo(() => {
    const totalUnits = items.reduce((sum, item) => sum + item.stock, 0)
    const availableUnits = items.reduce((sum, item) => sum + item.available, 0)
    const activeLoans = loans.filter(loan => loan.status === 'active')
    const lowStock = items.filter(item => item.available > 0 && item.available <= Math.max(2, Math.ceil(item.stock * 0.25))).length
    const outOfStock = items.filter(item => item.available === 0).length
    const nonTestedLoans = activeLoans.filter(loan => loan.initialState === 'Non testé').length
    return { totalUnits, availableUnits, activeLoans: activeLoans.length, lowStock, outOfStock, nonTestedLoans }
  }, [items, loans])

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs uppercase tracking-[0.16em] text-cyan">Vue opérationnelle</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-fog">État du laboratoire</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Une vue rapide des stocks, des emprunts et des points qui nécessitent votre attention.</p></div>
      <div className="flex gap-3"><button className="button-secondary" onClick={() => void refresh()}>Actualiser</button><Link className="button-primary" href="/">Ouvrir l’inventaire</Link></div>
    </div>
    {loading && <p className="notice" role="status">Chargement des données opérationnelles…</p>}
    {loadError && <div className="notice notice-error" role="alert"><span>{loadError}</span><button className="button-secondary" onClick={() => void refresh()}>Réessayer</button></div>}
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicateurs principaux">
      <StatCard label="Unités suivies" value={metrics.totalUnits} detail={`${items.length} références au catalogue`} tone="fog" />
      <StatCard label="Disponibles" value={metrics.availableUnits} detail={metrics.totalUnits ? `${Math.round(metrics.availableUnits / metrics.totalUnits * 100)}% du parc disponible` : 'Aucune donnée'} tone="mint" />
      <StatCard label="Emprunts actifs" value={metrics.activeLoans} detail={metrics.nonTestedLoans ? `${metrics.nonTestedLoans} retour(s) non testé(s)` : 'Aucun retour non testé'} tone="cyan" />
      <StatCard label="Alertes stock" value={metrics.lowStock + metrics.outOfStock} detail={`${metrics.outOfStock} rupture(s) · ${metrics.lowStock} faible(s)`} tone="orange" />
    </section>
    <div className="grid gap-6 xl:grid-cols-[1.05fr_1fr]">
      <StockAttention items={items} />
      <RecentLoans loans={loans} items={items} />
    </div>
    <CategoryBreakdown items={items} />
  </div>
}

