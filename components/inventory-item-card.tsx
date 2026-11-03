'use client'

import { memo } from 'react'
import type { Item } from '@/lib/inventory-types'
import { CATEGORY_LABELS } from '@/lib/inventory-catalog-model'

type Props = {
  item: Item
  stockBusy: boolean
  canManageStock: boolean
  onBorrow: (item: Item) => void
  onQr: (item: Item) => void
  onAdjustStock: (id: string, delta: number) => Promise<void>
}

function InventoryItemCard({ item, stockBusy, canManageStock, onBorrow, onQr, onAdjustStock }: Props) {
  const lowStock = (item.stock > 0 ? item.available / item.stock : 0) < 0.35
  return (
    <article className="equipment-card">
      <div className="equipment-photo">
        <img src={item.image} alt={item.name} loading="lazy" decoding="async" width={480} height={320} />
      </div>
      <div className="equipment-category">{CATEGORY_LABELS[item.category] || item.category}</div>
      <h2>{item.name}</h2>
      <div className={`reference-availability ${lowStock ? 'is-low' : ''}`}>
        <span className="status-dot" />
        {item.available === 0 ? 'Épuisé' : lowStock ? 'Stock faible' : 'Disponible'} — {item.available} {item.unit || 'unités'}
      </div>
      <div className="equipment-actions">
        <button className="button-primary" disabled={item.available === 0} onClick={() => onBorrow(item)}>Emprunter</button>
        <details
          className="equipment-menu"
          onKeyDown={event => {
            if (event.key === 'Escape') {
              event.currentTarget.open = false
              event.currentTarget.querySelector('summary')?.focus()
            }
          }}
          onBlur={event => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) event.currentTarget.open = false
          }}
        >
          <summary aria-label={`Actions pour ${item.name}`}>•••</summary>
          <div className="equipment-menu-content">
            <p>{item.description}</p>
            <p className="equipment-menu-id">{item.id}</p>
            <div className="equipment-specs">{item.specs.map(spec => <span key={spec}>{spec}</span>)}</div>
            <button className="button-secondary" onClick={() => onQr(item)}>Étiquette QR</button>
            {canManageStock && <div className="equipment-stock">
              <span>Stock total</span>
              <div className="stock-stepper">
                <button disabled={item.available === 0 || stockBusy} aria-label={`Retirer une unité de ${item.name}`} onClick={() => void onAdjustStock(item.id, -1)}>−</button>
                <span>{item.stock}</span>
                <button disabled={stockBusy} aria-label={`Ajouter une unité de ${item.name}`} onClick={() => void onAdjustStock(item.id, 1)}>+</button>
              </div>
            </div>}
          </div>
        </details>
      </div>
    </article>
  )
}

export default memo(InventoryItemCard)
