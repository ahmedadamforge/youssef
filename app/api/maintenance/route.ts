import { requireUser } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { withInventory, storageSource } from '@/lib/inventory-store'
import { apiError, bodyOf, createItem, createLoan, returnLoan, reportFault, updateStock, InputError } from '@/lib/inventory-service'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    await requireUser(request, true); return NextResponse.json(await withInventory(s => ({ logs: s.logs, source: storageSource() }))) } catch (e) { return apiError(e) }
}
export async function POST(request: Request) {
  try {
    await requireUser(request, true)
    const body = await bodyOf(request)
    return NextResponse.json({ ...await withInventory(s => reportFault(s, body), true), source: storageSource() }, { status: 201 })
  } catch (e) { return apiError(e) }
}
