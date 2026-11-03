'use client'
import { useState } from 'react'
import { useSession } from './session-provider'
export default function SessionMenu() {
  const user = useSession()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function logout() {
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' })
      if (!response.ok) throw new Error('Déconnexion impossible. Réessayez.')
      window.location.replace('/login')
    } catch (error) { setError(error instanceof Error ? error.message : 'Déconnexion impossible.'); setBusy(false) }
  }
  return <div className="session-menu"><div><span>{user.name}</span><small>{user.role === 'admin' ? 'Administrateur' : 'Utilisateur'}</small></div><button className="button-secondary" onClick={() => void logout()} disabled={busy}>{busy ? 'Déconnexion…' : 'Déconnexion'}</button>{error && <p role="alert">{error}</p>}</div>
}
