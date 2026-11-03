import { mkdir, readFile, rename, unlink, open } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type { PoolConnection, RowDataPacket } from 'mysql2/promise'
import { getDbPool } from './db'
import type { Item, Loan, MaintenanceLog, TestRun } from './inventory-types'

export type InventoryState = { items: Item[]; loans: Loan[]; logs: MaintenanceLog[]; testRuns: TestRun[] }
const empty = (): InventoryState => ({ items: [], loans: [], logs: [], testRuns: [] })
export const storageSource = () => process.env.DATABASE_URL ? 'database' : 'local'
const directory = () => path.resolve(process.env.INVENTORY_DATA_DIR || path.join(process.cwd(), 'data'))

async function readLocal(): Promise<InventoryState> {
  try {
    const state = JSON.parse(await readFile(path.join(directory(), 'inventory.json'), 'utf8'))
    if (!Array.isArray(state.items) || !Array.isArray(state.loans) || !Array.isArray(state.logs)) throw new Error('Invalid inventory data file')
    return { ...state, testRuns: Array.isArray(state.testRuns) ? state.testRuns : [] }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return empty()
    throw error
  }
}
const iso = (value: Date | string) => new Date(value).toISOString()
async function readMysql(db: PoolConnection): Promise<InventoryState> {
  const [items] = await db.query<RowDataPacket[]>('SELECT * FROM inventory_items ORDER BY category, name')
  const [loans] = await db.query<RowDataPacket[]>('SELECT * FROM inventory_loans ORDER BY loan_date DESC')
  const [logs] = await db.query<RowDataPacket[]>('SELECT * FROM maintenance_logs ORDER BY reported_at DESC')
  const [testRuns] = await db.query<RowDataPacket[]>('SELECT * FROM hardware_test_runs ORDER BY tested_at DESC')
  const itemNames = new Map(items.map(item => [item.id as string, item.name as string]))
  const name = (id: string) => itemNames.get(id)
  return {
    items: items.map(r => ({ id: r.id, name: r.name, category: r.category, description: r.description, image: r.image, stock: Number(r.stock), available: Number(r.available), unit: r.unit, specs: typeof r.specs === 'string' ? JSON.parse(r.specs) : r.specs, accent: r.accent })),
    loans: loans.map(r => ({ id: r.id, itemId: r.item_id, itemName: name(r.item_id), memberUserId: r.member_user_id || undefined, memberName: r.member_name, projectName: r.project_name, quantity: Number(r.quantity), initialState: r.initial_state, loanDate: iso(r.loan_date), status: r.status, returnedAt: r.returned_at ? iso(r.returned_at) : null })),
    logs: logs.map(r => ({ id: r.id, itemId: r.item_id, itemName: name(r.item_id), errorDetail: r.error_detail, reportedBy: r.reported_by, status: r.status, reportedAt: iso(r.reported_at) })),
    testRuns: testRuns.map(r => ({ id: r.id, itemId: r.item_id || null, itemName: r.item_id ? name(r.item_id) : undefined, testKey: r.test_key, testLabel: r.test_label, command: r.command, status: r.status, measurements: typeof r.measurements === 'string' ? JSON.parse(r.measurements) : r.measurements, rawResponse: r.raw_response || undefined, errorDetail: r.error_detail || undefined, testedBy: r.tested_by, testedAt: iso(r.tested_at) })),
  }
}
async function writeMysql(db: PoolConnection, state: InventoryState) {
  for (const i of state.items) await db.execute(
    'INSERT INTO inventory_items (id,name,category,description,image,stock,available,unit,specs,accent) VALUES (?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE stock=VALUES(stock),available=VALUES(available)',
    [i.id,i.name,i.category,i.description,i.image,i.stock,i.available,i.unit,JSON.stringify(i.specs),i.accent])
  for (const l of state.loans) await db.execute(
    'INSERT INTO inventory_loans (id,item_id,member_user_id,member_name,project_name,quantity,initial_state,loan_date,status,returned_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE status=VALUES(status),returned_at=VALUES(returned_at)',
    [l.id,l.itemId,l.memberUserId || null,l.memberName,l.projectName,l.quantity,l.initialState,new Date(l.loanDate),l.status,l.returnedAt ? new Date(l.returnedAt) : null])
  for (const l of state.logs) await db.execute(
    'INSERT INTO maintenance_logs (id,item_id,error_detail,reported_by,status,reported_at) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE status=VALUES(status)',
    [l.id,l.itemId,l.errorDetail,l.reportedBy,l.status,new Date(l.reportedAt)])
  for (const t of state.testRuns) await db.execute(
    'INSERT INTO hardware_test_runs (id,item_id,test_key,test_label,command,status,measurements,raw_response,error_detail,tested_by,tested_at) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE status=VALUES(status),measurements=VALUES(measurements),raw_response=VALUES(raw_response),error_detail=VALUES(error_detail)',
    [t.id,t.itemId || null,t.testKey,t.testLabel,t.command,t.status,JSON.stringify(t.measurements),t.rawResponse || null,t.errorDetail || null,t.testedBy,new Date(t.testedAt)])
}

// Commit stock and its related records together. Never switch stores on failure.
export async function withInventory<T>(operation: (state: InventoryState) => T, write = false): Promise<T> {
  const pool = getDbPool()
  if (pool) {
    const db = await pool.getConnection()
    let locked = false
    try {
      const [rows] = await db.query<RowDataPacket[]>("SELECT GET_LOCK(CONCAT(DATABASE(), ':inventory'), 10) AS acquired")
      if (rows[0].acquired !== 1) throw new Error('Inventory busy')
      locked = true
      await db.beginTransaction()
      const state = await readMysql(db)
      const result = operation(state)
      if (write) await writeMysql(db, state)
      await db.commit()
      return result
    } catch (error) {
      await db.rollback()
      throw error
    } finally {
      try { if (locked) await db.query("SELECT RELEASE_LOCK(CONCAT(DATABASE(), ':inventory'))") } finally { db.release() }
    }
  }
  if (!write) return operation(await readLocal())
  await mkdir(directory(), { recursive: true })
  const lockPath = path.join(directory(), 'inventory.lock')
  let lock
  for (let attempt = 0; attempt < 100; attempt++) {
    try { lock = await open(lockPath, 'wx'); break } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      await new Promise(resolve => setTimeout(resolve, 50))
    }
  }
  if (!lock) throw new Error('Inventory busy: check inventory.lock if the server stopped unexpectedly')
  const temporary = path.join(directory(), `${randomUUID()}.tmp`)
  try {
    const state = await readLocal()
    const result = operation(state)
    const file = await open(temporary, 'wx')
    try { await file.writeFile(JSON.stringify(state, null, 2)); await file.sync() } finally { await file.close() }
    await rename(temporary, path.join(directory(), 'inventory.json'))
    return result
  } finally {
    await unlink(temporary).catch(() => undefined)
    await lock.close()
    await unlink(lockPath)
  }
}
