import { requireUser } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { withInventory, storageSource } from '@/lib/inventory-store'
import { apiError, bodyOf, createItem, createLoan, returnLoan, reportFault, updateStock, InputError } from '@/lib/inventory-service'
export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireUser(request, true)
    const body = await bodyOf(request)
    return NextResponse.json({ ...await withInventory(s => updateStock(s, params.id, body), true), source: storageSource() })
  } catch (e) { return apiError(e) }
}
