import { requireSameOrigin, sessionResponse, createAccount } from '@/lib/auth'
import { apiError, bodyOf, InputError } from '@/lib/inventory-service'
export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
  try {
    requireSameOrigin(request)
    const body = await bodyOf(request)
    const setupToken = process.env.AUTH_SETUP_TOKEN
    if (setupToken && body.setupToken !== setupToken) throw new InputError('Code de configuration incorrect.', 403)
    if (!setupToken && !['localhost', '127.0.0.1', '[::1]'].includes(new URL(request.headers.get('origin')!).hostname)) throw new InputError('Configurez le premier compte depuis localhost ou définissez AUTH_SETUP_TOKEN.', 403)

    return sessionResponse(request, await createAccount(body, true), 201)
  } catch (error) { return apiError(error) }
}
