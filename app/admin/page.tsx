import AppShell from '@/components/app-shell'
import AdminUsers from '@/components/admin-users'
import { requirePageUser } from '@/lib/auth-page'
export default async function AdminPage() {
  const user = await requirePageUser(true)
  return <AppShell active="admin" title="Comptes & accès" description="Les bonnes permissions pour chaque membre du laboratoire." user={user}><AdminUsers /></AppShell>
}
