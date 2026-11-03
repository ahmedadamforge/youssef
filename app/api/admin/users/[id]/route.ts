import { NextResponse } from 'next/server'
import { requireUser, updateAccount } from '@/lib/auth'
import { apiError, bodyOf } from '@/lib/inventory-service'
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try { await requireUser(request, true); return NextResponse.json({ user: await updateAccount(params.id, await bodyOf(request)) }) } catch (error) { return apiError(error) }
}
