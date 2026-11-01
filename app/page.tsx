import Link from 'next/link'
import InventoryCatalog from '@/components/inventory-catalog'

const navItems: { label: string; active: boolean; href?: string }[] = [
  { label: 'Overview', active: false, href: '/' },
  { label: 'Circuit Tester', active: false, href: '/circuit-tester' },
  { label: 'Projects', active: false },
  { label: 'Events', active: false },
  { label: 'Inventory', active: true, href: '/' },
  { label: 'Members', active: false },
]

export default function Home() {
  return (
    <main className="min-h-screen bg-ink text-fog">
      <div className="site-grid" aria-hidden="true" />
      <div className="mx-auto flex min-h-screen max-w-[1500px] flex-col px-5 py-5 lg:flex-row lg:gap-6 lg:px-8 lg:py-8">
        <aside className="z-10 flex shrink-0 flex-col justify-between border-b border-white/10 pb-5 lg:w-[236px] lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
          <div>
            <div className="mb-10 flex items-center gap-3 px-1">
              <div className="brand-mark"><span /><span /><span /></div>
              <div>
                <p className="text-[11px] font-semibold tracking-[0.24em] text-cyan">CMC ROBOTICS</p>
                <p className="mt-1 text-[9px] tracking-[0.28em] text-muted">LAB / RABAT</p>
              </div>
            </div>
            <p className="eyebrow mb-3 px-1">Workspace</p>
            <nav className="space-y-1" aria-label="Primary navigation">
              {navItems.map((item) => item.href ? (
                <Link key={item.label} href={item.href} className={`nav-item ${item.active ? 'nav-item-active' : ''}`}>
                  <span className="nav-dot" />
                  {item.label}
                  {item.active && <span className="ml-auto text-cyan">↗</span>}
                </Link>
              ) : (
                <button key={item.label} className="nav-item"><span className="nav-dot" />{item.label}</button>
              ))}
            </nav>
          </div>
          <div className="mt-8 hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 lg:block">
            <p className="eyebrow">Inventory sync</p>
            <div className="mt-3 flex items-center gap-2 text-sm text-fog"><span className="status-dot status-dot-working" /> Catalog online</div>
            <p className="mt-2 text-xs leading-5 text-muted">Availability is ready for reservations and workshop checkouts.</p>
          </div>
        </aside>

        <section className="relative z-10 min-w-0 flex-1 pt-6 lg:pt-0">
          <header className="flex flex-col justify-between gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-start">
            <div>
              <p className="eyebrow">Club operations / 02</p>
              <h1 className="mt-3 max-w-2xl text-4xl font-medium tracking-[-0.045em] text-white sm:text-5xl">Inventory<span className="text-cyan">.</span></h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted">Everything the lab has on hand, from distance sensors to drive motors. Reserve the pieces you need before your next build session.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden rounded-full border border-white/10 px-3 py-2 text-[11px] text-muted sm:block"><span className="status-dot status-dot-working mr-2" />Live catalog</div>
              <button className="icon-button" aria-label="Toggle display theme">☼</button>
            </div>
          </header>
          <div className="py-6"><InventoryCatalog /></div>
        </section>
      </div>
    </main>
  )
}
