import { createClient } from '@libsql/client'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const migrationsDir = path.join(root, 'migrations')

const url = process.env.TURSO_URL
const authToken = process.env.TURSO_AUTH_TOKEN

if (!url || !authToken) {
  throw new Error('TURSO_URL and TURSO_AUTH_TOKEN are required to run migrations')
}

const db = createClient({ url, authToken })

function splitStatements(sql) {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean)
}

function isDuplicateColumnError(statement, err) {
  const message = err instanceof Error ? err.message : String(err)
  return /^ALTER\s+TABLE\s+.+\s+ADD\s+COLUMN\s+/i.test(statement) &&
    /duplicate column name/i.test(message)
}

await db.execute(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`)

const appliedRows = await db.execute('SELECT id FROM schema_migrations')
const applied = new Set(appliedRows.rows.map((row) => String(row.id)))
const files = (await readdir(migrationsDir))
  .filter((file) => file.endsWith('.sql'))
  .sort()

for (const file of files) {
  if (applied.has(file)) {
    console.log(`skip ${file}`)
    continue
  }

  const sql = await readFile(path.join(migrationsDir, file), 'utf8')
  const statements = splitStatements(sql)
  const tx = await db.transaction('write')
  try {
    for (const statement of statements) {
      try {
        await tx.execute(statement)
      } catch (err) {
        if (isDuplicateColumnError(statement, err)) {
          console.log(`skip duplicate column in ${file}: ${statement}`)
          continue
        }
        throw err
      }
    }
    await tx.execute({
      sql: 'INSERT INTO schema_migrations (id) VALUES (?)',
      args: [file],
    })
    await tx.commit()
    console.log(`applied ${file}`)
  } catch (err) {
    await tx.rollback().catch(() => {})
    throw err
  } finally {
    tx.close()
  }
}

db.close()
