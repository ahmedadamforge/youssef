import { requireUser } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { withInventory, storageSource } from '@/lib/inventory-store'
import { apiError, bodyOf, createTestRun } from '@/lib/inventory-service'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    await requireUser(request, false)
    return NextResponse.json(await withInventory(state => ({ testRuns: state.testRuns, source: storageSource() })))
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request, false)
    const body = await bodyOf(request)
    return NextResponse.json({ testRun: await withInventory(state => createTestRun(state, body, user.name), true), source: storageSource() }, { status: 201 })
  } catch (error) {
    return apiError(error)
  }
}
