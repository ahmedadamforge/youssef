'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useDialogFocus from './use-dialog-focus'
import { useSession } from './session-provider'
import type { Item, Loan } from '@/lib/inventory-types'

type LoanModalProps = {
  item: Item | null
  onClose: () => void
  onSuccess: (newLoan: Loan, item: Item) => void
}

export default function LoanModal({ item, onClose, onSuccess }: LoanModalProps) {
  useDialogFocus(onClose, !!item)
  const user = useSession()
  const isAdmin = user.role === 'admin'
  const [memberName, setMemberName] = useState(isAdmin ? '' : user.name)
  const [projectName, setProjectName] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [initialState, setInitialState] = useState<'Testé OK' | 'Non testé'>('Non testé')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!item) return null

  const resolvedProject = projectName

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!memberName.trim()) {
      setError('Veuillez renseigner le nom du membre.')
      return
    }
    if (!resolvedProject.trim()) {
      setError('Veuillez préciser le projet ou la cellule technique.')
      return
    }
    if (quantity < 1 || quantity > item!.available) {
      setError(`Quantité invalide (doit être entre 1 et ${item!.available}).`)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/inventory/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: item!.id,
          memberName: memberName.trim(),
          projectName: resolvedProject.trim(),
          quantity,
          initialState,
        }),
      })

      const data = (await res.json()) as { loan?: Loan; item?: Item; error?: string }
      if (!res.ok || !data.loan || !data.item) {
        throw new Error(data.error || "Échec de l'enregistrement de l'emprunt.")
      }

      onSuccess(data.loan, data.item)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/75">
        <motion.div
          role="dialog" aria-modal="true" aria-label="Emprunter du matériel" tabIndex={-1}
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg max-h-[92dvh] overflow-y-auto rounded-2xl border border-cyan/20 bg-[#101418] shadow-2xl shadow-cyan/10"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan/10 text-cyan text-xs">
                🏷️
              </span>
              <div>
                <h3 className="text-sm font-semibold tracking-wide text-white uppercase">
                  Emprunt Nominatif de Matériel
                </h3>
                <p className="text-[10px] text-muted">Traçabilité & Sécurité de l'inventaire</p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Fermer"
              className="rounded-lg p-1 text-muted transition hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="rounded-xl border border-orange/30 bg-orange/10 px-4 py-2.5 text-xs text-orange" role="alert">
                ⚠️ {error}
              </div>
            )}

            {/* Target Item Summary */}
            <div className="flex items-center gap-3.5 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <img
                src={item.image}
                alt={item.name}
                className="h-12 w-12 rounded-lg object-cover border border-white/10"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">{item.name}</p>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted">
                  <span className="font-mono text-cyan">{item.id.toUpperCase()}</span>
                  <span>·</span>
                  <span className="text-mint">{item.available} {item.unit} disponibles</span>
                </div>
              </div>
            </div>

            {/* Member Name */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-fog">
                Nom du membre emprunteur <span className="text-orange">*</span>
              </label>
              <input aria-label="Nom du membre"
                type="text"
                readOnly={!isAdmin}
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                placeholder="Nom et prénom du membre"
                maxLength={120} autoComplete="name"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs text-white outline-none transition focus:border-cyan/40 focus:bg-cyan/[0.03] placeholder:text-muted/60"
                required
              />

            </div>

            {/* Project / Cell */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-fog">
                Cellule / Projet concerné <span className="text-orange">*</span>
              </label>
              <input aria-label="Projet" type="text" value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="Nom du projet ou de l’atelier" required maxLength={120} className="w-full rounded-xl border border-white/10 bg-[#191f25] px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan/40" />
            </div>

            {/* Quantity and State */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-fog">
                  Quantité ({item.unit})
                </label>
                <div className="flex items-center gap-2">
                  <input aria-label="Quantité à emprunter"
                    type="number"
                    min={1}
                    max={item.available}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Math.min(item.available, Number(e.target.value))))}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs font-mono text-white outline-none focus:border-cyan/40"
                  />
                  <span className="text-[10px] text-muted shrink-0">max: {item.available}</span>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-fog">
                  État au départ
                </label>
                {isAdmin ? (<div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setInitialState('Testé OK')}
                    aria-pressed={initialState === 'Testé OK'}
                    className={`flex-1 rounded-xl border py-2 px-2 text-[11px] font-medium transition ${
                      initialState === 'Testé OK'
                        ? 'border-mint/40 bg-mint/10 text-mint'
                        : 'border-white/10 text-muted hover:border-white/20'
                    }`}
                  >
                    ✓ Testé OK
                  </button>
                  <button
                    type="button"
                    onClick={() => setInitialState('Non testé')}
                    aria-pressed={initialState === 'Non testé'}
                    className={`flex-1 rounded-xl border py-2 px-2 text-[11px] font-medium transition ${
                      initialState === 'Non testé'
                        ? 'border-orange/40 bg-orange/10 text-orange'
                        : 'border-white/10 text-muted hover:border-white/20'
                    }`}
                  >
                    Non testé
                  </button>
                </div>) : <p className="text-sm text-muted">Non testé</p>}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs text-muted transition hover:bg-white/5 hover:text-white"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading || item.available === 0}
                className="flex items-center gap-2 rounded-xl border border-cyan/40 bg-cyan px-5 py-2 text-xs font-semibold text-ink transition hover:bg-white disabled:opacity-40"
              >
                <span>{loading ? 'Validation…' : 'Confirmer le prêt'}</span>
                <span>↗</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
