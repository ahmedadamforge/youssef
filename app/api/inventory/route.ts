import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { withInventory, storageSource } from '@/lib/inventory-store'
import { apiError, bodyOf, createItem } from '@/lib/inventory-service'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  try { await requireUser(request); return NextResponse.json(await withInventory(state => ({ items: state.items, source: storageSource() }))) } catch (error) { return apiError(error) }
}
export async function POST(request: Request) {
  try {
    await requireUser(request, true)
    const body = await bodyOf(request)
    const item = await withInventory(state => createItem(state, body), true)
    return NextResponse.json({ item, source: storageSource() }, { status: 201 })
  } catch (error) { return apiError(error) }
}
