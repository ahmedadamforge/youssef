import { requireUser } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { withInventory } from '@/lib/inventory-store'
import { apiError } from '@/lib/inventory-service'
import { generateExcelBuffer } from '@/lib/excel-sync'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  try {
    await requireUser(request, true)
    const s = await withInventory(s => s)
    const buffer = await generateExcelBuffer(s.items, s.loans, s.logs)
    return new NextResponse(new Uint8Array(buffer), { headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="inventaire-cmc-robotics-el-hansali.xlsx"',
      'Cache-Control': 'no-store',
    } })
  } catch (e) { return apiError(e) }
}
