import { logout } from '@/lib/auth'
import { apiError } from '@/lib/inventory-service'
export async function POST(request: Request) {
  try { return await logout(request) } catch (error) { return apiError(error) }
}
