'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useDialogFocus from './use-dialog-focus'
import type { Item } from '@/lib/inventory-types'

type Props = { isOpen: boolean; onClose: () => void; onSuccess: (item: Item) => void }
type Accent = 'cyan' | 'orange' | 'mint'

const categoryOptions = [
  { value: 'Sensors', label: 'Capteurs & mesure' },
  { value: 'Motors', label: 'Moteurs & entraînement' },
  { value: 'Microcontrollers', label: 'Microcontrôleurs & cartes' },
  { value: 'Drivers & Logic', label: 'Drivers, relais & logique' },
  { value: 'Power', label: 'Alimentation & batteries' },
  { value: 'Prototyping', label: 'Prototypage & câblage' },
  { value: 'Communication', label: 'Communication & réseau' },
  { value: 'Displays', label: 'Affichage & signalisation' },
  { value: 'Actuators', label: 'Actionneurs & servos' },
  { value: 'Chassis & Mechanics', label: 'Châssis & mécanique' },
  { value: 'Connectors & Cables', label: 'Connectique & câbles' },
  { value: 'Tools & Consumables', label: 'Outils & consommables' },
  { value: 'Fasteners & Hardware', label: 'Visserie & quincaillerie' },
  { value: 'Safety & ESD', label: 'Protection & ESD' },
  { value: 'Autre', label: 'Autre type…' },
]
const categoryLabels = Object.fromEntries(categoryOptions.map(option => [option.value, option.label]))
const imageOptions = [
  { label: 'Arduino Uno R3', src: '/inventory/arduino-uno.jpg' },
  { label: 'ESP32 DevKit', src: '/inventory/esp32-devkit.jpg' },
  { label: 'Raspberry Pi Pico', src: '/inventory/raspberry-pi-pico.jpg' },
  { label: 'Capteur ultrasonique HC-SR04', src: '/inventory/ultrasonic-hc-sr04.jpg' },
  { label: 'Capteur de mouvement PIR', src: '/inventory/pir-motion-sensor.jpg' },
  { label: 'Barrette infrarouge 5 voies', src: '/inventory/ir-line-sensor.jpg' },
  { label: 'Capteur température DHT11', src: '/inventory/dht11-temperature.jpg' },
  { label: 'Module IMU MPU6050', src: '/inventory/mpu6050-imu.jpg' },
  { label: 'Micro servo SG90', src: '/inventory/servo-sg90.jpg' },
  { label: 'Paire moteur TT + roues', src: '/inventory/tt-motor-wheel.jpg' },
  { label: 'Kit moteur pas-à-pas 28BYJ-48', src: '/inventory/stepper-28byj48.jpg' },
  { label: 'Driver moteur L298N', src: '/inventory/l298n-motor-driver.jpg' },
  { label: 'Module relais 1 canal', src: '/inventory/relay-1ch.jpg' },
  { label: 'Support 2 accus 18650', src: '/inventory/battery-holder-18650.jpg' },
  { label: 'Kit breadboard', src: '/inventory/breadboard-kit.jpg' },
  { label: 'Kit de fils Dupont', src: '/inventory/breadboard-kit.jpg' },
]
const fallbackImage = imageOptions[0].src

export default function AddMaterialModal({ isOpen, onClose, onSuccess }: Props) {
  useDialogFocus(onClose, isOpen)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Sensors')
  const [customCategory, setCustomCategory] = useState('')
  const [description, setDescription] = useState('')
  const [stock, setStock] = useState(1)
  const [available, setAvailable] = useState(1)
  const [unit, setUnit] = useState('pièces')
  const [specs, setSpecs] = useState('')
  const [accent, setAccent] = useState<Accent>('cyan')
  const [image, setImage] = useState(fallbackImage)
  const [imageLabel, setImageLabel] = useState(imageOptions[0].label)
  const [customImage, setCustomImage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null
  const resolvedCategory = category === 'Autre' ? customCategory.trim() : category
  const resolvedImage = customImage.trim() || image
  const resolvedCategoryLabel = categoryLabels[resolvedCategory] || resolvedCategory || 'Type à choisir'
  const selectedImageLabel = customImage.trim() ? 'Illustration personnalisée' : imageLabel
  const specList = specs.split(',').map(value => value.trim()).filter(Boolean)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return setError('Le nom du matériel est obligatoire.')
    if (!resolvedCategory) return setError('Choisissez une catégorie.')
    if (stock < 1 || available < 0 || available > stock) return setError('Vérifiez le stock et la quantité disponible.')
    setLoading(true); setError(null)
    try {
      const response = await fetch('/api/inventory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), category: resolvedCategory, description: description.trim() || 'Matériel inventorié au CMC Robotics Lab.', stock, available, unit: unit.trim() || 'pièces', specs: specList, accent, image: resolvedImage }) })
      const data = await response.json() as { item?: Item; error?: string }
      if (!response.ok || !data.item) throw new Error(data.error || 'Impossible d’ajouter le matériel.')
      onSuccess(data.item); onClose()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Erreur inconnue.')
    } finally { setLoading(false) }
  }

  return <AnimatePresence>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <motion.div role="dialog" aria-modal="true" aria-label="Ajouter du matériel" tabIndex={-1} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="w-full max-w-2xl overflow-hidden rounded-2xl border border-cyan/25 bg-[#101820] shadow-2xl shadow-black/40">
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan/15 text-lg text-cyan">＋</div><div><h2 className="text-base font-semibold text-white">Ajouter du matériel</h2><p className="mt-0.5 text-xs text-muted">Renseignez les informations principales de l’équipement.</p></div></div><button type="button" onClick={onClose} aria-label="Fermer" className="rounded-lg p-2 text-muted hover:bg-white/10 hover:text-white">✕</button></header>

        <form onSubmit={submit} className="max-h-[82vh] space-y-5 overflow-y-auto p-5">
          {error && <div role="alert" className="rounded-lg border border-orange/35 bg-orange/10 px-3 py-2 text-xs text-orange">⚠️ {error}</div>}

          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.03] p-3"><img src={resolvedImage} alt="Aperçu du matériel" onError={event => { event.currentTarget.src = fallbackImage }} className="h-16 w-20 rounded-lg bg-[#e9edf0] object-contain" /><div className="min-w-0"><p className="text-[10px] uppercase tracking-[.15em] text-muted">Aperçu</p><p className="mt-1 truncate text-sm font-semibold text-white">{name || 'Nouveau matériel'}</p><p className="mt-1 text-xs text-cyan">{resolvedCategoryLabel} · {available}/{stock} {unit || 'unités'}</p></div></div>

          <div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-xs font-medium text-fog">Nom du matériel <b className="text-orange">*</b></span><input autoFocus aria-label="Nom du matériel" value={name} onChange={event => setName(event.target.value)} placeholder="Ex. Arduino Uno R3" maxLength={160} className="w-full rounded-lg border border-white/10 bg-white/[.035] px-3 py-2.5 text-sm text-white outline-none focus:border-cyan/50" required /></label><label><span className="mb-1.5 block text-xs font-medium text-fog">Type de matériel <b className="text-orange">*</b></span><select aria-label="Type de matériel" value={category} onChange={event => setCategory(event.target.value)} className="w-full rounded-lg border border-white/10 bg-[#191f25] px-3 py-2.5 text-sm text-white outline-none focus:border-cyan/50">{categoryOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>
          {category === 'Autre' && <input aria-label="Catégorie personnalisée" value={customCategory} onChange={event => setCustomCategory(event.target.value)} placeholder="Nom de la catégorie" className="w-full rounded-lg border border-white/10 bg-white/[.035] px-3 py-2.5 text-sm text-white outline-none focus:border-cyan/50" required />}

          <label className="block"><span className="mb-1.5 block text-xs font-medium text-fog">Description</span><textarea aria-label="Description du matériel" value={description} onChange={event => setDescription(event.target.value)} rows={2} maxLength={2000} placeholder="Usage, tension, brochage ou consigne utile…" className="w-full resize-y rounded-lg border border-white/10 bg-white/[.035] px-3 py-2.5 text-sm text-white outline-none focus:border-cyan/50" /></label>

          <div className="grid gap-3 sm:grid-cols-3"><label><span className="mb-1.5 block text-xs font-medium text-fog">Stock total <b className="text-orange">*</b></span><input aria-label="Stock total" type="number" min={1} value={stock} onChange={event => { const value = Math.max(1, Number(event.target.value)); setStock(value); setAvailable(current => Math.min(current, value)) }} className="w-full rounded-lg border border-white/10 bg-white/[.035] px-3 py-2.5 font-mono text-sm text-white outline-none focus:border-cyan/50" required /></label><label><span className="mb-1.5 block text-xs font-medium text-fog">Disponible</span><input aria-label="Quantité disponible" type="number" min={0} max={stock} value={available} onChange={event => setAvailable(Math.min(stock, Math.max(0, Number(event.target.value))))} className="w-full rounded-lg border border-white/10 bg-white/[.035] px-3 py-2.5 font-mono text-sm text-mint outline-none focus:border-cyan/50" required /></label><label><span className="mb-1.5 block text-xs font-medium text-fog">Unité</span><input aria-label="Unité" value={unit} onChange={event => setUnit(event.target.value)} placeholder="pièces" className="w-full rounded-lg border border-white/10 bg-white/[.035] px-3 py-2.5 text-sm text-white outline-none focus:border-cyan/50" /></label></div>

          <div className="grid gap-4 sm:grid-cols-[1fr_auto]"><label><span className="mb-1.5 block text-xs font-medium text-fog">Spécifications <span className="font-normal text-muted">séparées par virgules</span></span><input aria-label="Spécifications techniques" value={specs} onChange={event => setSpecs(event.target.value)} placeholder="5V, I2C, USB, 180°…" className="w-full rounded-lg border border-white/10 bg-white/[.035] px-3 py-2.5 text-sm text-white outline-none focus:border-cyan/50" /></label><div><span className="mb-1.5 block text-xs font-medium text-fog">Accent</span><div className="flex gap-2">{(['cyan', 'orange', 'mint'] as Accent[]).map(value => <button key={value} type="button" onClick={() => setAccent(value)} aria-label={`Accent ${value}`} className={`h-10 w-10 rounded-lg border ${accent === value ? value === 'cyan' ? 'border-cyan bg-cyan/20' : value === 'orange' ? 'border-orange bg-orange/20' : 'border-mint bg-mint/20' : 'border-white/10 bg-white/[.03]'}`}><span className={`mx-auto block h-3 w-3 rounded-full ${value === 'cyan' ? 'bg-cyan' : value === 'orange' ? 'bg-orange' : 'bg-mint'}`} /></button>)}</div></div></div>

          <div><label><span className="mb-1.5 block text-xs font-medium text-fog">Illustration du matériel</span><select aria-label="Illustration du matériel" value={customImage.trim() ? '__custom__' : image} onChange={event => { const value = event.target.value; const option = imageOptions.find(candidate => candidate.src === value); if (value === '__custom__') { setImage(fallbackImage); setImageLabel('URL personnalisée'); setCustomImage('') } else { setImage(value); setImageLabel(option?.label || 'Illustration'); setCustomImage('') } }} className="w-full rounded-lg border border-white/10 bg-[#191f25] px-3 py-2.5 text-sm text-white outline-none focus:border-cyan/50">{imageOptions.map(option => <option key={option.label} value={option.src}>{option.label}</option>)}<option value="__custom__">URL personnalisée…</option></select></label><div className="mt-2 flex items-center gap-3 rounded-lg border border-white/10 bg-white/[.03] p-2"><img src={resolvedImage} alt={selectedImageLabel} onError={event => { event.currentTarget.src = fallbackImage }} className="h-12 w-16 rounded bg-[#e9edf0] object-contain" /><span className="text-xs text-muted">{selectedImageLabel}</span></div><input aria-label="URL de l’image" type="url" value={customImage} onChange={event => setCustomImage(event.target.value)} placeholder="Ou saisir une URL d’image personnalisée" className="mt-2 w-full rounded-lg border border-white/10 bg-white/[.035] px-3 py-2.5 text-xs text-white outline-none focus:border-cyan/50" /></div>

          <footer className="flex justify-end gap-3 border-t border-white/10 pt-4"><button type="button" onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2.5 text-xs text-muted hover:bg-white/5 hover:text-white">Annuler</button><button type="submit" disabled={loading} className="rounded-lg bg-cyan px-5 py-2.5 text-xs font-semibold text-ink hover:bg-white disabled:opacity-40">{loading ? 'Enregistrement…' : 'Ajouter au catalogue'}</button></footer>
        </form>
      </motion.div>
    </div>
  </AnimatePresence>
}
