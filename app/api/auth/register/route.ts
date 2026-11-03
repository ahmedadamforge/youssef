import { requireSameOrigin, sessionResponse, createAccount } from '@/lib/auth'
import { apiError, bodyOf, InputError } from '@/lib/inventory-service'
export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
  try {
    requireSameOrigin(request)
    const body = await bodyOf(request)
    return sessionResponse(request, await createAccount(body), 201)
  } catch (error) { return apiError(error) }
}
