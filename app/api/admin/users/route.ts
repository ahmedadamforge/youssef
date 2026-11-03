import { NextResponse } from 'next/server'
import { requireUser, listUsers } from '@/lib/auth'
import { apiError } from '@/lib/inventory-service'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  try { await requireUser(request, true); return NextResponse.json({ users: await listUsers() }, { headers: { 'Cache-Control': 'no-store' } }) } catch (error) { return apiError(error) }
}
