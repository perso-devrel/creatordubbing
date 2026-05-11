import 'server-only'

import { getDb } from '@/lib/db/client'

let sessionsTableReady = false

async function ensureSessionTable() {
  if (sessionsTableReady) return
  const db = getDb()
  await db.batch([
    {
      sql: `CREATE TABLE IF NOT EXISTS app_sessions (
        session_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        revoked_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_app_sessions_user
        ON app_sessions (user_id, created_at DESC)`,
      args: [],
    },
  ])
  sessionsTableReady = true
}

export async function createUserSession(args: {
  sessionId: string
  userId: string
  expiresAt: Date
}) {
  await ensureSessionTable()
  await getDb().execute({
    sql: `INSERT INTO app_sessions (session_id, user_id, expires_at)
          VALUES (?, ?, ?)`,
    args: [args.sessionId, args.userId, args.expiresAt.toISOString()],
  })
}

export async function revokeUserSession(sessionId: string) {
  await ensureSessionTable()
  await getDb().execute({
    sql: `UPDATE app_sessions
          SET revoked_at = datetime('now'), updated_at = datetime('now')
          WHERE session_id = ?`,
    args: [sessionId],
  })
}

export async function isUserSessionActive(sessionId: string, userId: string) {
  await ensureSessionTable()
  const result = await getDb().execute({
    sql: `SELECT session_id
          FROM app_sessions
          WHERE session_id = ?
            AND user_id = ?
            AND revoked_at IS NULL
            AND datetime(expires_at) > datetime('now')`,
    args: [sessionId, userId],
  })
  return Boolean(result.rows[0])
}
