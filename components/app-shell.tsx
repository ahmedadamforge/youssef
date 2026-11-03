import Link from 'next/link'
import type { ReactNode } from 'react'
import type { PublicUser } from '@/lib/auth-types'
import { SessionProvider } from './session-provider'
import SessionMenu from './session-menu'

export default function AppShell({ active, title, description, children, user }: { active: 'dashboard' | 'inventory' | 'tester' | 'admin'; title: string; description: string; children: ReactNode; user: PublicUser }) {
  return <SessionProvider user={user}><div className="app-shell reference-shell">
    <a className="skip-link" href="#workspace">Aller au contenu</a>
    <header className="top-navigation">
      <Link href="/" className="top-brand" aria-label="CMC Robotics — Inventaire"><img src="/logo.png" alt="" /><span>CMC ROBOTICS LAB / RABAT</span></Link>
      <nav aria-label="Navigation principale" className="top-nav-links">
        <Link href="/dashboard" aria-current={active === 'dashboard' ? 'page' : undefined}>Dashboard</Link><Link href="/" aria-current={active === 'inventory' ? 'page' : undefined}>Inventaire</Link>
        {user.role === 'admin' && <Link href="/circuit-tester" aria-current={active === 'tester' ? 'page' : undefined}>Circuit Tester</Link>}
        {user.role === 'admin' && <Link href="/admin" aria-current={active === 'admin' ? 'page' : undefined}>Comptes</Link>}
      </nav>
      <SessionMenu />
    </header>
    <main id="workspace" className="reference-workspace">
      {active !== 'inventory' && <header className="page-heading"><h1>{title}</h1><p>{description}</p></header>}
      {children}
      <footer className="workspace-footer"><span>CMC Robotics Lab · Rabat</span><span>Responsable matériel : EL HANSALI Youssef</span></footer>
    </main>
  </div></SessionProvider>
}

