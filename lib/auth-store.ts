import { mkdir, readFile, open, rename, unlink } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { getDbPool } from './db'
import type { RowDataPacket } from 'mysql2/promise'
import type { AuthState } from './auth-types'

const empty = (): AuthState => ({ users: [], sessions: [] })
const directory = () => path.resolve(process.env.INVENTORY_DATA_DIR || path.join(process.cwd(), 'data'))
async function readLocal(): Promise<AuthState> {
  try {
    const state = JSON.parse(await readFile(path.join(directory(), 'accounts.json'), 'utf8'))
    if (!Array.isArray(state.users) || !Array.isArray(state.sessions)) throw new Error('Invalid account store')
    return state
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return empty()
    throw error
  }
}

export async function withAuthState<T>(operation: (state: AuthState) => T | Promise<T>, write = false): Promise<T> {
  const pool = getDbPool()
  if (pool) {
    const db = await pool.getConnection()
    let locked = false
    try {
      if (write) {
        const [locks] = await db.query<RowDataPacket[]>("SELECT GET_LOCK(CONCAT(DATABASE(), ':accounts'), 10) AS acquired")
        if (locks[0].acquired !== 1) throw new Error('Accounts busy')
        locked = true
      }
      const [rows] = await db.query<RowDataPacket[]>('SELECT state FROM app_auth_state WHERE id = 1')
      const state: AuthState = rows.length ? (typeof rows[0].state === 'string' ? JSON.parse(rows[0].state) : rows[0].state) : empty()
      const result = await operation(state)
      if (write) await db.execute('INSERT INTO app_auth_state (id, state) VALUES (1, ?) ON DUPLICATE KEY UPDATE state = VALUES(state)', [JSON.stringify(state)])
      return result
    } finally {
      try { if (locked) await db.query("SELECT RELEASE_LOCK(CONCAT(DATABASE(), ':accounts'))") } finally { db.release() }
    }
  }
  if (!write) return operation(await readLocal())
  await mkdir(directory(), { recursive: true })
  const lockPath = path.join(directory(), 'accounts.lock')
  let lock
  for (let attempt = 0; attempt < 100; attempt++) {
    try { lock = await open(lockPath, 'wx'); break } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      await new Promise(resolve => setTimeout(resolve, 50))
    }
  }
  if (!lock) throw new Error('Accounts busy')
  const temporary = path.join(directory(), `${randomUUID()}.accounts.tmp`)
  try {
    const state = await readLocal()
    const result = await operation(state)
    const file = await open(temporary, 'wx', 0o600)
    try { await file.writeFile(JSON.stringify(state)); await file.sync() } finally { await file.close() }
    await rename(temporary, path.join(directory(), 'accounts.json'))
    return result
  } finally {
    await unlink(temporary).catch(() => undefined)
    await lock.close()
    await unlink(lockPath)
  }
}
