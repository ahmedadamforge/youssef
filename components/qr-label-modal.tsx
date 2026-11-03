'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import useDialogFocus from './use-dialog-focus'
import type { Item } from '@/lib/inventory-types'

function labelPayload(item: Item) {
  return JSON.stringify({ lab: 'CMC Robotics Lab Rabat', id: item.id, name: item.name, category: item.category, specs: item.specs })
}

export default function QrLabelModal({ item, onClose }: { item: Item | null; onClose: () => void }) {
  useDialogFocus(onClose, !!item)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [copyError, setCopyError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let active = true
    setQrDataUrl(''); setGenerationError(null); setCopyError(null); setCopied(false)
    if (!item) return
    QRCode.toDataURL(labelPayload(item), { width: 320, margin: 2, color: { dark: '#101418', light: '#FFFFFF' }, errorCorrectionLevel: 'M' })
      .then(url => { if (active) setQrDataUrl(url) })
      .catch(() => { if (active) setGenerationError('Impossible de générer cette étiquette. Fermez puis réessayez.') })
    return () => { active = false }
  }, [item])

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  if (!item) return null

  async function handleCopy() {
    setCopyError(null); setCopied(false)
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(labelPayload(item!))
      setCopied(true)
    } catch {
      setCopyError('Copie indisponible. Vous pouvez télécharger l’étiquette en PNG.')
    }
  }

  function handleDownload() {
    if (!qrDataUrl || !item) return
    const anchor = document.createElement('a')
    anchor.href = qrDataUrl
    anchor.download = `QR-${item.id.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`
    document.body.appendChild(anchor); anchor.click(); anchor.remove()
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
    <section role="dialog" aria-modal="true" aria-labelledby="qr-dialog-title" tabIndex={-1} className="w-full max-w-lg max-h-[92dvh] overflow-y-auto rounded-2xl border border-white/20 bg-[#101418] p-5 sm:p-6">
      <header className="flex items-center justify-between gap-4 border-b border-white/10 pb-4"><h2 id="qr-dialog-title" className="text-lg font-semibold text-white">Étiquette d’inventaire</h2><button className="button-secondary" onClick={onClose}>Fermer</button></header>
      <p className="mt-4 text-sm leading-6 text-muted">Imprimez cette étiquette pour identifier votre matériel et retrouver ses caractéristiques.</p>
      {generationError && <p role="alert" className="notice notice-error">{generationError}</p>}
      <div id="printable-label" className="qr-label my-5 rounded-xl bg-white p-4 text-ink sm:p-5">
        <div className="border-b border-ink pb-3 text-xs font-bold">CMC ROBOTICS LAB · RABAT</div>
        <div className="qr-label-body mt-4 flex items-start gap-4">
          <div className="shrink-0">{qrDataUrl ? <img src={qrDataUrl} alt={`QR Code ${item.name}`} width={112} height={112} /> : <p role="status" className="flex h-28 w-28 items-center justify-center text-center text-xs text-gray-600">{generationError ? 'QR indisponible' : 'Génération…'}</p>}</div>
          <div className="min-w-0"><h3 className="text-base font-bold">{item.name}</h3><p className="mt-1 break-all font-mono text-[10px] text-gray-700">REF : {item.id}</p><p className="mt-2 text-xs text-gray-700">{item.category} · {item.unit}</p><div className="mt-2 flex flex-wrap gap-1">{item.specs.map(spec => <span key={spec} className="rounded border border-gray-300 px-1.5 py-0.5 text-[9px] text-gray-800">{spec}</span>)}</div></div>
        </div>
        <p className="mt-4 border-t border-dashed border-gray-300 pt-2 text-center text-[9px] text-gray-600">Cellule technique & prototypage · Fiche matériel</p>
      </div>
      {copyError && <p role="alert" className="notice notice-error">{copyError}</p>}
      <p role="status" className="sr-only">{copied ? 'Données copiées.' : ''}</p>
      <div className="flex flex-wrap gap-2"><button className="button-primary flex-1" disabled={!qrDataUrl} onClick={() => window.print()}>Imprimer</button><button className="button-secondary flex-1" disabled={!qrDataUrl} onClick={handleDownload}>Image PNG</button><button className="button-secondary flex-1" onClick={() => void handleCopy()}>{copied ? 'Copié !' : 'Copier les données'}</button></div>
    </section>
  </div>
}
