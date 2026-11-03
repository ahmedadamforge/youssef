'use client'

import dynamic from 'next/dynamic'
import { useCallback, useDeferredValue, useMemo, useState } from 'react'
import type { Item, Loan } from '@/lib/inventory-types'
import { buildCatalogIndex, filterCatalog, CATEGORY_LABELS, type StockFilter } from '@/lib/inventory-catalog-model'
import useInventory from './use-inventory'
import InventoryItemCard from './inventory-item-card'
import { useSession } from './session-provider'

function ModalLoading() {
  return <div role="status" className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 text-fog">Ouverture…</div>
}
const LoanModal = dynamic(() => import('./loan-modal'), { loading: ModalLoading })
const QrLabelModal = dynamic(() => import('./qr-label-modal'), { loading: ModalLoading })
const AddMaterialModal = dynamic(() => import('./add-material-modal'), { loading: ModalLoading })
const ActiveLoansList = dynamic(() => import('./active-loans-list'), {
  loading: () => <p role="status" className="text-muted">Chargement des emprunts…</p>,
})

export const RESPONSIBLE_NAME = 'EL HANSALI Youssef'
const SAVED_MESSAGE = 'Modification enregistrée. Le prochain export Excel contient les données à jour.'

export default function InventoryCatalog() {
  const user = useSession()
  const isAdmin = user.role === 'admin'
  const { items: inventory, loans, loading, loadError, stockUpdatingId, refresh, recordItem, recordLoan, adjustStock, returnLoan } = useInventory()
  const [stockMessage, setStockMessage] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState('All')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [activeTab, setActiveTab] = useState<'catalog' | 'loans'>('catalog')
  const [selectedForLoan, setSelectedForLoan] = useState<Item | null>(null)
  const [selectedForQr, setSelectedForQr] = useState<Item | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const catalog = useMemo(() => buildCatalogIndex(inventory), [inventory])
  const { categories, categoryCounts, totalAvailable } = catalog
  const activeLoansCount = useMemo(() => loans.reduce((count, loan) => count + Number(loan.status === 'active'), 0), [loans])
  const filtered = useMemo(() => filterCatalog(catalog, activeCategory, stockFilter, deferredQuery), [catalog, activeCategory, stockFilter, deferredQuery])

  function resetFilters() {
    setQuery('')
    setActiveCategory('All')
    setStockFilter('all')
  }

  function handleAddSuccess(item: Item) {
    recordItem(item)
    resetFilters()
    setActiveTab('catalog')
    setStockMessage(SAVED_MESSAGE)
  }

  function handleLoanSuccess(loan: Loan, item: Item) {
    recordLoan(loan, item)
    setStockMessage(SAVED_MESSAGE)
  }

  const handleAdjustStock = useCallback(async (id: string, delta: number) => {
    try {
      if (await adjustStock(id, delta)) setStockMessage(SAVED_MESSAGE)
    } catch (error) {
      setStockMessage(error instanceof Error ? error.message : 'Erreur de modification du stock.')
    }
  }, [adjustStock])

  const handleReturnLoan = useCallback(async (id: string) => {
    await returnLoan(id)
    setStockMessage('Retour enregistré.')
  }, [returnLoan])

  return <div className="inventory-workspace">
    {loading && <p role="status" className="notice">Chargement de votre inventaire…</p>}
    {loadError && <div role="alert" className="notice notice-error">{loadError}<button className="button-secondary" onClick={() => void refresh()}>Réessayer</button></div>}
    <fieldset disabled={loading || !!loadError} className="inventory-fieldset">
      <div className="inventory-commandbar reference-heading"><div><h1>Inventaire</h1><p>Les bons composants. Toujours à portée.</p></div><div className="command-actions">{isAdmin && <><a className="button-secondary export-action" href="/api/inventory/export" download="inventaire-cmc-robotics-el-hansali.xlsx">Exporter Excel</a><button className="button-primary" onClick={() => setShowAddModal(true)}>+ Ajouter du matériel</button></>} </div></div>
      <div className="reference-summary" aria-label="Résumé de l’inventaire"><span><strong>{totalAvailable}</strong> unités disponibles</span><button onClick={() => setActiveTab('loans')}><strong>{activeLoansCount}</strong> emprunts actifs</button></div>
      <div className="inventory-tabbar" role="tablist" aria-label="Vue de l’inventaire" onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
        event.preventDefault()
        const next = event.key === 'Home' ? 'catalog' : event.key === 'End' ? 'loans' : activeTab === 'catalog' ? 'loans' : 'catalog'
        setActiveTab(next)
        event.currentTarget.querySelector<HTMLButtonElement>(`#${next}-tab`)?.focus()
      }}><button id="catalog-tab" role="tab" tabIndex={activeTab === 'catalog' ? 0 : -1} aria-selected={activeTab === 'catalog'} aria-controls="catalog-panel" onClick={() => setActiveTab('catalog')}>Catalogue</button><button id="loans-tab" role="tab" tabIndex={activeTab === 'loans' ? 0 : -1} aria-selected={activeTab === 'loans'} aria-controls="loans-panel" onClick={() => setActiveTab('loans')}>{isAdmin ? 'Emprunts actifs' : 'Mes emprunts'}</button></div>
      {stockMessage && <div role="status" className="notice"><span>{stockMessage}</span><button aria-label="Fermer la notification" onClick={() => setStockMessage(null)}>Fermer</button></div>}
      {activeTab === 'loans' ? <section id="loans-panel" role="tabpanel" aria-labelledby="loans-tab" className="loans-panel"><ActiveLoansList loans={loans} onReturnLoan={handleReturnLoan} /></section> : <section id="catalog-panel" aria-busy={query !== deferredQuery} role="tabpanel" aria-labelledby="catalog-tab">
        <div className="catalog-toolbar"><label className="catalog-search"><span className="sr-only">Rechercher du matériel</span><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un matériel (nom, modèle…)" /></label><label><span className="sr-only">Catégorie</span><select value={activeCategory} onChange={e => setActiveCategory(e.target.value)}>{categories.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c] || c} ({c === 'All' ? inventory.length : categoryCounts[c] || 0})</option>)}</select></label><label><span className="sr-only">Disponibilité</span><select value={stockFilter} onChange={e => setStockFilter(e.target.value as StockFilter)}><option value="all">Toutes les disponibilités</option><option value="available">En stock</option><option value="low">Stock faible</option></select></label></div>
        {(query || activeCategory !== 'All' || stockFilter !== 'all') && <div className="catalog-resultline"><span>{filtered.length} résultat(s)</span><button onClick={resetFilters}>Effacer les filtres</button></div>}

        <div className="catalog-grid">
          {filtered.map(item => <InventoryItemCard
            key={item.id}
            item={item}
            stockBusy={stockUpdatingId !== null}
            canManageStock={isAdmin}
            onBorrow={setSelectedForLoan}
            onQr={setSelectedForQr}
            onAdjustStock={handleAdjustStock}
          />)}
        </div>
        {!filtered.length && !loading && <div className="inventory-empty"><span className="empty-kicker">{inventory.length ? 'AUCUN RÉSULTAT' : isAdmin ? 'VOTRE ATELIER COMMENCE ICI' : 'LE CATALOGUE DU LABORATOIRE'}</span><h2>{inventory.length ? 'Aucun composant trouvé.' : isAdmin ? 'Prêt à organiser votre matériel ?' : 'Aucun matériel disponible pour le moment.'}</h2><p>{inventory.length ? 'Essayez un autre nom ou élargissez vos filtres.' : isAdmin ? 'Ajoutez votre premier composant pour suivre les stocks et les emprunts.' : 'Le responsable du laboratoire ajoutera le matériel ici.'}</p>{(inventory.length > 0 || isAdmin) && <button className="button-primary" onClick={inventory.length ? resetFilters : () => setShowAddModal(true)}>{inventory.length ? 'Réinitialiser les filtres' : '+ Ajouter mon premier matériel'}</button>}</div>}
      </section>}
    </fieldset>
    {isAdmin && showAddModal && <AddMaterialModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSuccess={handleAddSuccess} />}
    {selectedForLoan && <LoanModal item={selectedForLoan} onClose={() => setSelectedForLoan(null)} onSuccess={handleLoanSuccess} />}
    {selectedForQr && <QrLabelModal item={selectedForQr} onClose={() => setSelectedForQr(null)} />}
  </div>
}
