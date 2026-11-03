import { requirePageUser } from '@/lib/auth-page'
import InventoryCatalog from '@/components/inventory-catalog'
import AppShell from '@/components/app-shell'

export default async function Home() {
  const user = await requirePageUser(false)
  return <AppShell user={user} active="inventory" title="Inventaire" description="Les bons composants. Toujours à portée de main."><InventoryCatalog /></AppShell>
}
