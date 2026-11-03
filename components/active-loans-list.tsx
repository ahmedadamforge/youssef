'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Loan } from '@/lib/inventory-types'

type ActiveLoansListProps = {
  loans: Loan[]
  onReturnLoan: (loanId: string) => Promise<void>
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso)
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  } catch {
    return iso
  }
}

export default function ActiveLoansList({ loans, onReturnLoan }: ActiveLoansListProps) {
  const [query, setQuery] = useState('')
  const [returningId, setReturningId] = useState<string | null>(null)
  const [returnError, setReturnError] = useState<string | null>(null)

  const activeLoans = loans.filter((l) => l.status === 'active')

  const filtered = activeLoans.filter((l) => {
    const text = `${l.memberName} ${l.projectName} ${l.itemName || l.itemId} ${l.initialState}`.toLowerCase()
    return text.includes(query.toLowerCase())
  })

  async function handleReturn(loanId: string) {
    setReturningId(loanId)
    setReturnError(null)
    try {
      await onReturnLoan(loanId)
    } catch (error) {
      setReturnError(error instanceof Error ? error.message : 'Retour impossible. Réessayez.')
    } finally {
      setReturningId(null)
    }
  }

  return (
    <div className="space-y-4">
      {returnError && <div className="notice notice-error" role="alert">{returnError}</div>}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange/10 text-orange text-sm">
            📋
          </div>
          <div>
            <h3 className="text-base font-medium text-white">Registre des Emprunts Actifs</h3>
            <p className="text-xs text-muted">
              {activeLoans.length} emprunt{activeLoans.length > 1 ? 's' : ''} en cours de détention par les membres
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-muted">
            <span>⌕</span>
            <input
              type="search" aria-label="Rechercher un emprunt par membre ou projet"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtrer par membre, projet…"
              className="bg-transparent text-fog outline-none placeholder:text-muted w-44"
            />
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <p className="text-sm text-fog">Aucun emprunt actif ne correspond à cette recherche.</p>
          <p className="mt-1 text-xs text-muted">{query ? 'Essayez un autre nom de membre ou de projet.' : 'Les nouveaux emprunts apparaîtront ici.'}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {filtered.map((loan) => {
              const isReturning = returningId === loan.id
              return (
                <motion.div
                  key={loan.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#191f25] p-4 shadow-sm"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="inline-block rounded-md border border-cyan/20 bg-cyan/10 px-2 py-0.5 text-[10px] font-medium text-cyan">
                          {loan.projectName}
                        </span>
                        <h4 className="mt-2 text-sm font-semibold text-white">{loan.memberName}</h4>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          loan.initialState === 'Testé OK'
                            ? 'border border-mint/20 bg-mint/10 text-mint'
                            : 'border border-orange/20 bg-orange/10 text-orange'
                        }`}
                      >
                        {loan.initialState}
                      </span>
                    </div>

                    {/* Component Info */}
                    <div className="mt-3.5 rounded-xl border border-white/5 bg-white/[0.03] p-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-white truncate mr-2">
                          {loan.itemName || loan.itemId}
                        </span>
                        <span className="shrink-0 font-mono text-cyan font-semibold">
                          x{loan.quantity}
                        </span>
                      </div>
                      <div className="mt-1 text-[10px] font-mono text-muted">
                        ID: {loan.itemId}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-muted">
                      <span>Emprunté le :</span>
                      <span className="text-fog">{formatDate(loan.loanDate)}</span>
                    </div>
                  </div>

                  {/* Return Action */}
                  <div className="mt-4 pt-3 border-t border-white/10">
                    <button
                      onClick={() => void handleReturn(loan.id)}
                      disabled={returningId !== null}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-mint/30 bg-mint/10 py-2 px-3 text-xs font-semibold text-mint transition hover:bg-mint hover:text-ink disabled:opacity-50"
                    >
                      <span>{isReturning ? 'Restitution en cours…' : '✓ Valider le retour'}</span>
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
