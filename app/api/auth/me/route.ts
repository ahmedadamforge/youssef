import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { apiError } from '@/lib/inventory-service'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  try { return NextResponse.json({ user: await requireUser(request) }, { headers: { 'Cache-Control': 'no-store' } }) } catch (error) { return apiError(error) }
}
