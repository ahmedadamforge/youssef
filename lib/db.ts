import mysql from 'mysql2/promise'
declare global { var __cmcInventoryPool: mysql.Pool | undefined }
export function getDbPool(): mysql.Pool | null {
  if (!process.env.DATABASE_URL) return null
  global.__cmcInventoryPool ??= mysql.createPool({ uri: process.env.DATABASE_URL, connectionLimit: 5, connectTimeout: 5000 })
  return global.__cmcInventoryPool
}
