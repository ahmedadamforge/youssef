import { NextResponse } from 'next/server'
import mysql from 'mysql2/promise'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'

export const dynamic = 'force-dynamic'

type InventoryRow = RowDataPacket & {
  id: string
  name: string
  category: string
  description: string
  image: string
  stock: number
  available: number
  unit: string
  specs: string | string[]
  accent: string
}

declare global {
  // eslint-disable-next-line no-var
  var __cmcInventoryPool: mysql.Pool | undefined
}

function getPool() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured')
  global.__cmcInventoryPool ??= mysql.createPool({ uri: process.env.DATABASE_URL, connectionLimit: 5, connectTimeout: 5000 })
  return global.__cmcInventoryPool
}

function serialize(row: InventoryRow) {
  return { ...row, specs: typeof row.specs === 'string' ? JSON.parse(row.specs) : row.specs }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json() as { action?: 'reserve' | 'release' }
    if (body.action !== 'reserve' && body.action !== 'release') return NextResponse.json({ error: 'Action must be reserve or release.' }, { status: 400 })

    const pool = getPool()
    const condition = body.action === 'reserve' ? 'available > 0' : 'available < stock'
    const delta = body.action === 'reserve' ? -1 : 1
    const [result] = await pool.execute<ResultSetHeader>(`UPDATE inventory_items SET available = available + ? WHERE id = ? AND ${condition}`, [delta, params.id])
    if (!result.affectedRows) return NextResponse.json({ error: body.action === 'reserve' ? 'No units are available.' : 'No active reservation to release.' }, { status: 409 })

    const [rows] = await pool.execute<InventoryRow[]>('SELECT id, name, category, description, image, stock, available, unit, specs, accent FROM inventory_items WHERE id = ?', [params.id])
    if (!rows.length) return NextResponse.json({ error: 'Inventory item not found.' }, { status: 404 })
    return NextResponse.json({ item: serialize(rows[0]), source: 'database' }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('inventory_update_failed', error)
    return NextResponse.json({ error: 'Inventory database is unavailable.' }, { status: 503 })
  }
}
