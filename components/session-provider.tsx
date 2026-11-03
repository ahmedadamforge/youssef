'use client'
import { createContext, useContext, type ReactNode } from 'react'
import type { PublicUser } from '@/lib/auth-types'
const SessionContext = createContext<PublicUser | null>(null)
export function SessionProvider({ user, children }: { user: PublicUser; children: ReactNode }) {
  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>
}
export function useSession() {
  const user = useContext(SessionContext)
  if (!user) throw new Error('An authenticated session is required')
  return user
}
