import { requirePageUser } from '@/lib/auth-page'
import OperationsDashboard from '@/components/operations-dashboard'
import AppShell from '@/components/app-shell'

export default async function DashboardPage() {
  const user = await requirePageUser(false)
  return <AppShell user={user} active="dashboard" title="Dashboard" description="Une vue opérationnelle de votre matériel, de vos stocks et de vos emprunts."><OperationsDashboard /></AppShell>
}
