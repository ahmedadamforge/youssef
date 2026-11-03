import { redirect } from 'next/navigation'
import { hasAccounts } from '@/lib/auth'
import AuthForm from '@/components/auth-form'
export const dynamic = 'force-dynamic'
export default async function AuthPage() {
  if (await hasAccounts()) redirect('/login')
  return <AuthForm mode="setup" needsSetupToken={!!process.env.AUTH_SETUP_TOKEN} />
}
