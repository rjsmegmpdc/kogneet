import initSqlJs, { type Database } from 'sql.js'
import fs from 'fs'
import path from 'path'
import { log } from '../utils/logger'

let db: Database | null = null
let dbPath: string | null = null

/**
 * Initialise the SQLite database. Creates the file and runs migrations.
 * Must be called after the data folder is known.
 */
export async function initDatabase(dataFolder: string): Promise<Database> {
  dbPath = path.join(dataFolder, 'kogneet.db')

  const SQL = await initSqlJs()

  // Load existing database or create new
  try {
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath)
      db = new SQL.Database(buffer)
    } else {
      db = new SQL.Database()
    }
  } catch {
    db = new SQL.Database()
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON')

  await runMigrations(db)
  saveToFile()
  return db
}

/**
 * Get the active database instance. Throws if not initialised.
 */
export function getDb(): Database {
  if (!db) throw new Error('Database not initialised. Call initDatabase() first.')
  return db
}

/**
 * Persist the in-memory database to disk.
 * sql.js works in-memory; we must explicitly save after writes.
 */
export function saveToFile(): void {
  if (!db || !dbPath) return
  const data = db.export()
  const buffer = Buffer.from(data)
  const dir = path.dirname(dbPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  // Atomic write: write to temp, then rename
  const tmpPath = dbPath + '.tmp'
  fs.writeFileSync(tmpPath, buffer)
  fs.renameSync(tmpPath, dbPath)
}

/**
 * Close the database connection and save to disk.
 */
export function closeDatabase(): void {
  if (db) {
    saveToFile()
    db.close()
    db = null
  }
}

/**
 * Run all pending migrations in order.
 */
async function runMigrations(database: Database): Promise<void> {
  database.run(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  // Find migrations directory — check both dev and production paths
  const possibleDirs = [
    path.join(__dirname, '..', 'database', 'migrations'),
    path.join(__dirname, 'migrations'),
    path.join(__dirname, '..', '..', 'src', 'main', 'database', 'migrations')
  ]

  let sqlDir: string | null = null
  for (const d of possibleDirs) {
    if (fs.existsSync(d)) {
      sqlDir = d
      break
    }
  }

  if (!sqlDir) {
    log('INFO', 'No migrations directory found, skipping')
    return
  }

  const files = fs.readdirSync(sqlDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  const applied = new Set<string>()
  const rows = database.exec('SELECT name FROM _migrations')
  if (rows.length > 0) {
    for (const row of rows[0].values) {
      applied.add(row[0] as string)
    }
  }

  for (const file of files) {
    if (applied.has(file)) continue

    const sql = fs.readFileSync(path.join(sqlDir, file), 'utf-8')
    database.run(sql)
    database.run('INSERT INTO _migrations (name) VALUES (?)', [file])
    log('INFO', `Migration applied: ${file}`)
  }
}
