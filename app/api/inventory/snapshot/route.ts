import { requireUser } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { withInventory, storageSource } from '@/lib/inventory-store'
import { apiError } from '@/lib/inventory-service'

export const dynamic = 'force-dynamic'

// One storage read keeps the catalog and its loans on the same committed snapshot.
export async function GET(request: Request) {
  try {
    const user = await requireUser(request)
    const snapshot = await withInventory(state => ({ items: state.items, loans: user.role === 'admin' ? state.loans : state.loans.filter(loan => loan.memberUserId === user.id), source: storageSource() }))
    return NextResponse.json(snapshot, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return apiError(error)
  }
}
