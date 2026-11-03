'use client'
import { useCallback, useEffect, useState } from 'react'
import type { PublicUser } from '@/lib/auth-types'
import { useSession } from './session-provider'

export default function AdminUsers() {
  const current = useSession()
  const [users, setUsers] = useState<PublicUser[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/admin/users', { cache: 'no-store', signal })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Chargement impossible.')
      if (!signal?.aborted) { setUsers(data.users); setError('') }
    } catch (error) { if (!signal?.aborted) setError(error instanceof Error ? error.message : 'Chargement impossible.') }
    finally { if (!signal?.aborted) setLoading(false) }
  }, [])
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort() }, [load])
  async function update(user: PublicUser, change: Partial<Pick<PublicUser, 'active' | 'role'>>) {
    setPending(user.id); setError(''); setMessage('')
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(change) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Modification impossible.')
      setUsers(previous => previous.map(candidate => candidate.id === user.id ? data.user : candidate))
      setMessage('Compte mis à jour. Ses anciennes sessions ont été fermées.')
      if (user.id === current.id) window.location.replace('/login')
    } catch (error) { setError(error instanceof Error ? error.message : 'Modification impossible.') }
    finally { setPending(null) }
  }
  return <section className="admin-users">
    <p className="text-muted text-sm leading-6">Gérez les rôles et l’accès des membres. Les nouveaux comptes sont créés comme utilisateurs.</p>
    {loading && <p role="status" className="notice">Chargement des comptes…</p>}
    {error && <div role="alert" className="notice notice-error">{error}<button className="button-secondary" onClick={() => void load()}>Actualiser</button></div>}
    {message && <p role="status" className="notice">{message}</p>}
    <div className="account-list">{users.map(user => <article className="account-row" key={user.id}>
      <div className="account-identity"><h2>{user.name}{user.id === current.id && <small> · Vous</small>}</h2><p>{user.email}</p></div>
      <span className={`account-status ${user.active ? '' : 'is-inactive'}`}>{user.active ? 'Actif' : 'Désactivé'}</span>
      <label><span className="sr-only">Rôle de {user.name}</span><select value={user.role} disabled={!!pending} onChange={event => void update(user, { role: event.target.value as PublicUser['role'] })}><option value="user">Utilisateur</option><option value="admin">Admin</option></select></label>
      <button className="button-secondary" disabled={!!pending} onClick={() => void update(user, { active: !user.active })}>{pending === user.id ? 'Enregistrement…' : user.active ? 'Désactiver' : 'Réactiver'}</button>
    </article>)}</div>
  </section>
}
