export type UserRole = 'admin' | 'user'
export type PublicUser = { id: string; name: string; email: string; role: UserRole; active: boolean }
export type StoredUser = PublicUser & { passwordHash: string; createdAt: string; failedAttempts: number; lockedUntil: number }
export type StoredSession = { tokenHash: string; userId: string; expiresAt: number }
export type AuthState = { users: StoredUser[]; sessions: StoredSession[] }
