import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { withInventory, storageSource } from '@/lib/inventory-store'
import { apiError, bodyOf, createLoan } from '@/lib/inventory-service'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  try {
    const user = await requireUser(request)
    return NextResponse.json(await withInventory(state => ({ loans: user.role === 'admin' ? state.loans : state.loans.filter(loan => loan.memberUserId === user.id), source: storageSource() })))
  } catch (error) { return apiError(error) }
}
export async function POST(request: Request) {
  try {
    const user = await requireUser(request)
    const body = await bodyOf(request)
    // Regular users cannot select another borrower or claim a hardware verification.
    const input = user.role === 'admin' ? body : { ...body, memberName: user.name, initialState: 'Non testé' }
    return NextResponse.json({ ...await withInventory(state => {
      const result = createLoan(state, input)
      if (user.role === 'user') result.loan.memberUserId = user.id
      return result
    }, true), source: storageSource() }, { status: 201 })
  } catch (error) { return apiError(error) }
}
