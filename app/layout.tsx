import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CMC Robotics Lab — Circuit Tester',
  description: 'Hardware test bench for Robotics Club CMC Rabat.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
