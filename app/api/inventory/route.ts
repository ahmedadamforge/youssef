import { NextResponse } from 'next/server'
import mysql from 'mysql2/promise'
import type { RowDataPacket } from 'mysql2/promise'

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

export async function GET() {
  try {
    const [rows] = await getPool().query<InventoryRow[]>('SELECT id, name, category, description, image, stock, available, unit, specs, accent FROM inventory_items ORDER BY category, name')
    return NextResponse.json({ items: rows.map(serialize), source: 'database' }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('inventory_get_failed', error)
    return NextResponse.json({ error: 'Inventory database is unavailable.' }, { status: 503 })
  }
}
