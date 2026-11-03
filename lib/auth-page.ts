import { cookies } from 'next/headers'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { getSessionUser, hasAccounts, SESSION_COOKIE } from './auth'

export const getPageUser = cache(async () => getSessionUser(cookies().get(SESSION_COOKIE)?.value || ''))
export async function requirePageUser(admin = false) {
  const user = await getPageUser()
  if (!user) redirect(await hasAccounts() ? '/login' : '/setup')
  if (admin && user.role !== 'admin') redirect('/')
  return user
}
