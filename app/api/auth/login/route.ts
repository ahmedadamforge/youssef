import { requireSameOrigin, sessionResponse, login } from '@/lib/auth'
import { apiError, bodyOf, InputError } from '@/lib/inventory-service'
export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
  try {
    requireSameOrigin(request)
    const body = await bodyOf(request)
    return sessionResponse(request, await login(body), 200)
  } catch (error) { return apiError(error) }
}
