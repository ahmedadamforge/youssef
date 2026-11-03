import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { withInventory, storageSource } from '@/lib/inventory-store'
import { apiError, bodyOf, returnLoan, InputError } from '@/lib/inventory-service'
export const dynamic = 'force-dynamic'
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(request)
    const body = await bodyOf(request)
    if (body.action !== 'return') throw new InputError('Action invalide.')
    const result = await withInventory(state => {
      const loan = state.loans.find(candidate => candidate.id === params.id)
      if (!loan) throw new InputError('Emprunt introuvable.', 404)
      if (user.role !== 'admin' && loan.memberUserId !== user.id) throw new InputError('Vous ne pouvez retourner que votre propre matériel.', 403)
      return returnLoan(state, params.id)
    }, true)
    return NextResponse.json({ ...result, source: storageSource() })
  } catch (error) { return apiError(error) }
}
