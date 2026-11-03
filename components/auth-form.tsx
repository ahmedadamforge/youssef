'use client'
import { useState, type FormEvent } from 'react'

export default function AuthForm({ mode, needsSetupToken = false }: { mode: 'login' | 'setup'; needsSetupToken?: boolean }) {
  const [register, setRegister] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [setupToken, setSetupToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const creating = mode === 'setup' || register
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('')
    if (creating && password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }
    setBusy(true)
    try {
      const response = await fetch(`/api/auth/${mode === 'setup' ? 'setup' : register ? 'register' : 'login'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, ...(mode === 'setup' ? { setupToken } : {}) }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Connexion impossible.')
      window.location.replace('/')
    } catch (error) { setError(error instanceof Error ? error.message : 'Le serveur ne répond pas.'); setBusy(false) }
  }
  return <main className="auth-page"><section className="auth-card">
    <a href="/" className="auth-brand"><img src="/logo.png" alt="" /><span>CMC ROBOTICS LAB<small>RABAT</small></span></a>
    <p className="eyebrow">{mode === 'setup' ? 'PREMIÈRE CONFIGURATION' : 'VOTRE ESPACE LABORATOIRE'}</p>
    <h1>{mode === 'setup' ? 'Créer le compte Admin' : register ? 'Rejoindre le laboratoire' : 'Bon retour.'}</h1>
    <p className="auth-intro">{mode === 'setup' ? 'Choisissez les identifiants du premier administrateur. Cette étape ne sera disponible qu’une fois.' : register ? 'Votre compte utilisateur vous permet de consulter et d’emprunter le matériel.' : 'Connectez-vous pour retrouver le matériel et vos emprunts.'}</p>
    {mode !== 'setup' && <div className="auth-switch"><button type="button" aria-pressed={!register} disabled={busy} onClick={() => { setRegister(false); setError('') }}>Connexion</button><button type="button" aria-pressed={register} disabled={busy} onClick={() => { setRegister(true); setError('') }}>Créer un compte</button></div>}
    <form onSubmit={submit} className="auth-fields">
      {error && <div role="alert" className="notice notice-error">{error}</div>}
      {creating && <label>Nom et prénom<input value={name} onChange={event => setName(event.target.value)} autoComplete="name" required maxLength={120} disabled={busy} /></label>}
      <label>Adresse email<input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="username" required maxLength={254} disabled={busy} /></label>
      <label>Mot de passe<input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete={creating ? 'new-password' : 'current-password'} minLength={creating ? 10 : undefined} maxLength={128} required disabled={busy} />{creating && <small>10 caractères minimum.</small>}</label>
      {creating && <label>Confirmer le mot de passe<input type="password" value={confirm} onChange={event => setConfirm(event.target.value)} autoComplete="new-password" required maxLength={128} disabled={busy} /></label>}
      {mode === 'setup' && needsSetupToken && <label>Code de configuration<input type="password" value={setupToken} onChange={event => setSetupToken(event.target.value)} required disabled={busy} autoComplete="off" /></label>}
      <button className="button-primary" type="submit" disabled={busy}>{busy ? 'Veuillez patienter…' : mode === 'setup' ? 'Créer mon compte Admin' : register ? 'Créer mon compte utilisateur' : 'Se connecter'}</button>
    </form>
  </section></main>
}
