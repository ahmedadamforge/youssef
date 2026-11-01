import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not configured in this runtime.')
}

const schema = await fs.readFile(path.join(root, 'db/migrations/001_inventory.sql'), 'utf8')
const seed = JSON.parse(await fs.readFile(path.join(root, 'db/inventory-seed.json'), 'utf8'))
const connection = await mysql.createConnection(databaseUrl)

try {
  await connection.query(schema)
  await connection.beginTransaction()
  for (const item of seed) {
    await connection.execute(
      `INSERT INTO inventory_items (id, name, category, description, image, stock, available, unit, specs, accent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name), category = VALUES(category), description = VALUES(description),
         image = VALUES(image), stock = VALUES(stock), available = LEAST(inventory_items.available, VALUES(stock)),
         unit = VALUES(unit), specs = VALUES(specs), accent = VALUES(accent)`,
      [item.id, item.name, item.category, item.description, item.image, item.stock, item.available, item.unit, JSON.stringify(item.specs), item.accent],
    )
  }
  await connection.commit()
  console.log(`Inventory database ready: ${seed.length} items seeded.`)
} catch (error) {
  await connection.rollback()
  throw error
} finally {
  await connection.end()
}
