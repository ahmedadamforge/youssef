import Link from 'next/link'
import CircuitTester from '@/components/circuit-tester'
import BrandMark from '@/components/brand-mark'

export default function CircuitTesterPage() {
  return (
    <main className="min-h-screen bg-ink text-fog">
      <div className="site-grid" aria-hidden="true" />
      <div className="mx-auto max-w-[1500px] px-5 py-5 lg:px-8 lg:py-8">
        <header className="relative z-10 flex flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3"><BrandMark /><div><p className="text-[11px] font-semibold tracking-[0.24em] text-cyan">CMC ROBOTICS</p><p className="mt-1 text-[9px] tracking-[0.28em] text-muted">LAB / RABAT</p></div></div>
          <nav className="flex flex-wrap items-center gap-2 text-xs"><Link href="/" className="rounded-full border border-white/10 px-3 py-2 text-muted transition hover:border-cyan/30 hover:text-cyan">Inventory</Link><span className="rounded-full border border-cyan/30 bg-cyan/10 px-3 py-2 text-cyan">Circuit Tester</span></nav>
        </header>
        <section className="relative z-10 pt-8"><p className="eyebrow">Web-only hardware workspace / 03</p><h1 className="mt-3 text-4xl font-medium tracking-[-0.045em] text-white sm:text-5xl">Circuit Tester<span className="text-cyan">.</span></h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Connect an Arduino, ESP32, or compatible board, confirm the serial handshake, and verify every sensor, motor, driver, relay, output, and power rail connected to your workbench.</p><div className="mt-7"><CircuitTester /></div></section>
      </div>
    </main>
  )
}
