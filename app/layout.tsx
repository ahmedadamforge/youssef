import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CMC Robotics Lab — Inventaire & Tests USB',
  description: 'Gestion du matériel, emprunts et banc de test USB du CMC Robotics Lab.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
