'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'

type Category = 'All' | 'Sensors' | 'Motors' | 'Microcontrollers' | 'Power & Tools'
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

const inventory: Item[] = [
  {
    id: 'arduino-uno', name: 'Arduino Uno R3', category: 'Microcontrollers',
    description: 'A reliable starter board for rapid prototypes, line followers, and workshops.',
    image: '/inventory/arduino-uno.jpg', stock: 12, available: 8, unit: 'boards',
    specs: ['ATmega328P', '14 digital I/O', '5V logic'], accent: 'cyan',
  },
  {
    id: 'esp32-devkit', name: 'ESP32 DevKit', category: 'Microcontrollers',
    description: 'Wi-Fi + Bluetooth microcontroller for connected robots and remote control builds.',
    image: '/inventory/esp32-devkit.jpg', stock: 10, available: 3, unit: 'boards',
    specs: ['Wi-Fi / BLE', 'Dual core', '3.3V logic'], accent: 'orange',
  },
  {
    id: 'ultrasonic-hc-sr04', name: 'Ultrasonic HC-SR04', category: 'Sensors',
    description: 'Distance sensor for obstacle avoidance, mapping, and autonomous navigation.',
    image: '/inventory/ultrasonic-hc-sr04.jpg', stock: 24, available: 19, unit: 'sensors',
    specs: ['2–400 cm', '5V input', 'Echo / Trigger'], accent: 'mint',
  },
  {
    id: 'servo-sg90', name: 'Micro Servo SG90', category: 'Motors',
    description: 'Compact 180° servo for grippers, pan-tilt rigs, and articulated mechanisms.',
    image: '/inventory/servo-sg90.jpg', stock: 18, available: 11, unit: 'servos',
    specs: ['180° rotation', '1.8 kg·cm', 'PWM control'], accent: 'orange',
  },
  {
    id: 'tt-motor-wheel', name: 'TT Gear Motor Pair', category: 'Motors',
    description: 'Matched gear motors and wheels for 2WD and 4WD mobile robot chassis.',
    image: '/inventory/tt-motor-wheel.jpg', stock: 16, available: 6, unit: 'pairs',
    specs: ['3–6V DC', '1:48 gearbox', '65 mm wheels'], accent: 'cyan',
  },
  {
    id: 'jumper-kit', name: 'Jumper Wire Kit', category: 'Power & Tools',
    description: 'Breadboard-ready wiring kit for quick lab connections and training sessions.',
    image: '/inventory/arduino-uno.jpg', stock: 20, available: 14, unit: 'kits',
    specs: ['M-M / M-F / F-F', 'Dupont 2.54 mm', '120 pieces'], accent: 'mint',
  },
]

const categories: { label: Category; count?: number }[] = [
  { label: 'All', count: inventory.length },
  { label: 'Sensors' },
  { label: 'Motors' },
  { label: 'Microcontrollers' },
  { label: 'Power & Tools' },
]

const accentClass: Record<string, string> = {
  cyan: 'text-cyan border-cyan/20 bg-cyan/10',
  orange: 'text-orange border-orange/20 bg-orange/10',
  mint: 'text-mint border-mint/20 bg-mint/10',
}

export default function InventoryCatalog() {
  const [activeCategory, setActiveCategory] = useState<Category>('All')
  const [query, setQuery] = useState('')
  const [borrowed, setBorrowed] = useState<string[]>([])
  const [showBorrowed, setShowBorrowed] = useState(false)

  const filtered = useMemo(() => inventory.filter((item) => {
    const categoryMatch = activeCategory === 'All' || item.category === activeCategory
    const searchMatch = `${item.name} ${item.category} ${item.description}`.toLowerCase().includes(query.toLowerCase())
    const borrowedMatch = !showBorrowed || borrowed.includes(item.id)
    return categoryMatch && searchMatch && borrowedMatch
  }), [activeCategory, borrowed, query, showBorrowed])

  const totalAvailable = inventory.reduce((sum, item) => sum + item.available, 0)
  const lowStock = inventory.filter((item) => item.available / item.stock < 0.35).length

  function toggleBorrow(item: Item) {
    setBorrowed((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="stat-card"><p className="eyebrow">Total catalog</p><p className="mt-2 text-2xl font-medium text-white">{inventory.length}<span className="ml-2 text-xs text-muted">SKUs</span></p><p className="mt-1 text-xs text-muted">Tracked across the lab</p></div>
        <div className="stat-card"><p className="eyebrow">Available now</p><p className="mt-2 text-2xl font-medium text-mint">{totalAvailable}<span className="ml-2 text-xs text-muted">units</span></p><p className="mt-1 text-xs text-muted">Ready for a new build</p></div>
        <div className="stat-card"><p className="eyebrow">Needs attention</p><p className="mt-2 text-2xl font-medium text-orange">{lowStock}<span className="ml-2 text-xs text-muted">low stock</span></p><p className="mt-1 text-xs text-muted">Restock before next workshop</p></div>
      </div>

      <div className="glass-panel overflow-hidden rounded-[22px]">
        <div className="flex flex-col gap-4 border-b border-white/10 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div><p className="eyebrow">Lab inventory / 02</p><h2 className="mt-2 text-2xl font-medium tracking-[-0.035em] text-white">Components ready to build<span className="text-cyan">.</span></h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Browse the club stock, check what is available, and reserve the pieces you need for your next prototype.</p></div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/10 px-3 py-2 text-xs text-muted"><span className="status-dot status-dot-working" /> Live catalog <span className="mx-1 text-white/20">/</span> synced now</div>
        </div>

        <div className="flex flex-col gap-3 border-b border-white/10 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">{categories.map((category) => <button key={category.label} onClick={() => setActiveCategory(category.label)} className={`rounded-full border px-3 py-2 text-xs transition ${activeCategory === category.label ? 'border-cyan/40 bg-cyan/10 text-cyan' : 'border-white/10 text-muted hover:border-white/20 hover:text-fog'}`}>{category.label}{category.count ? <span className="ml-2 text-[10px] opacity-60">{category.count}</span> : null}</button>)}</div>
          <div className="flex items-center gap-2">
            <label className="flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-muted"><span className="text-sm">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search parts" className="w-full bg-transparent text-fog outline-none placeholder:text-muted md:w-36" /></label>
            <button onClick={() => setShowBorrowed((value) => !value)} className={`whitespace-nowrap rounded-full border px-3 py-2 text-xs transition ${showBorrowed ? 'border-orange/40 bg-orange/10 text-orange' : 'border-white/10 text-muted hover:text-fog'}`}>My borrow list {borrowed.length ? `· ${borrowed.length}` : ''}</button>
          </div>
        </div>

        <div className="grid gap-px bg-white/10 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((item) => {
              const isBorrowed = borrowed.includes(item.id)
              const stockRatio = item.available / item.stock
              return <motion.article key={item.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: .25 }} className="group bg-[#0d2631] p-4">
                <div className="relative overflow-hidden rounded-2xl bg-white">
                  <img src={item.image} alt={`${item.name} component`} className="h-48 w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                  <div className="absolute left-3 top-3 flex items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${accentClass[item.accent]}`}>{item.category}</span>{stockRatio < .35 && <span className="rounded-full border border-orange/30 bg-[#371b12]/90 px-2.5 py-1 text-[10px] text-orange">Low stock</span>}</div>
                  <div className="absolute bottom-3 right-3 rounded-full bg-[#07161E]/85 px-2.5 py-1 font-mono text-[10px] text-fog">{item.id.toUpperCase()}</div>
                </div>
                <div className="px-1 pt-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-base font-medium text-white">{item.name}</h3><p className="mt-1.5 min-h-[42px] text-xs leading-5 text-muted">{item.description}</p></div><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.available > 0 ? 'bg-mint shadow-[0_0_0_4px_rgba(147,229,192,.1)]' : 'bg-orange'}`} /></div>
                  <div className="mt-4 flex flex-wrap gap-1.5">{item.specs.map((spec) => <span key={spec} className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] text-muted">{spec}</span>)}</div>
                  <div className="mt-4"><div className="mb-2 flex items-center justify-between text-[11px]"><span className="text-muted">Availability</span><span className={stockRatio < .35 ? 'text-orange' : 'text-mint'}>{item.available} / {item.stock} {item.unit}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full ${stockRatio < .35 ? 'bg-orange' : 'bg-cyan'}`} style={{ width: `${stockRatio * 100}%` }} /></div></div>
                  <button onClick={() => toggleBorrow(item)} disabled={item.available === 0} className={`mt-4 flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-xs transition ${isBorrowed ? 'border-orange/40 bg-orange/10 text-orange' : 'border-cyan/20 bg-cyan/[0.06] text-cyan hover:border-cyan/40 hover:bg-cyan/10'} disabled:cursor-not-allowed disabled:opacity-40`}><span>{isBorrowed ? 'Reserved for your build' : item.available ? 'Add to borrow list' : 'Currently unavailable'}</span><span>{isBorrowed ? '✓' : '＋'}</span></button>
                </div>
              </motion.article>
            })}
          </AnimatePresence>
        </div>
        {!filtered.length && <div className="p-12 text-center"><p className="text-sm text-fog">No components match this view.</p><button onClick={() => { setQuery(''); setActiveCategory('All'); setShowBorrowed(false) }} className="mt-3 text-xs text-cyan hover:underline">Reset filters</button></div>}

        <div className="flex flex-col gap-3 border-t border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm text-fog">Need a part that is not listed?</p><p className="mt-1 text-xs text-muted">Ask the lab manager to add a component or report a stock mismatch.</p></div><button className="rounded-xl border border-white/10 px-4 py-2.5 text-xs text-fog transition hover:border-cyan/30 hover:text-cyan">Contact inventory lead <span className="ml-2">↗</span></button></div>
      </div>
    </div>
  )
}
