import { requirePageUser } from '@/lib/auth-page'
import CircuitTester from '@/components/circuit-tester'
import AppShell from '@/components/app-shell'

export default async function CircuitTesterPage() {
  const user = await requirePageUser(true)
  return <AppShell user={user} active="tester" title="Circuit Tester" description="Connectez votre carte, vérifiez la liaison série et testez votre matériel."><div className="hardware-workspace"><CircuitTester /></div></AppShell>
}
