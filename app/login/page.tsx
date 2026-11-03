import { redirect } from 'next/navigation'
import { getPageUser } from '@/lib/auth-page'
import { hasAccounts } from '@/lib/auth'
import AuthForm from '@/components/auth-form'
export default async function AuthPage() {
  if (await getPageUser()) redirect('/')
  if (!await hasAccounts()) redirect('/setup')
  return <AuthForm mode="login" />
}
