import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) throw new Error('DATABASE_URL is not configured in this runtime.')

const connection = await mysql.createConnection(databaseUrl)

try {
  for (const migration of ['001_inventory.sql', '002_hardware_test_runs.sql']) {
    const schema = await fs.readFile(path.join(root, 'db/migrations', migration), 'utf8')
    const statements = schema.split(';').map(s => s.trim()).filter(Boolean)
    for (const statement of statements) await connection.query(statement)
  }

  const [columns] = await connection.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inventory_loans' AND COLUMN_NAME = 'member_user_id'")
  if (!columns.length) await connection.query('ALTER TABLE inventory_loans ADD COLUMN member_user_id VARCHAR(80) NULL AFTER member_name')
  console.log('Inventory, accounts and hardware test history schema ready. No sample records inserted.')
} catch (error) {
  await connection.rollback()
  throw error
} finally {
  await connection.end()
}
