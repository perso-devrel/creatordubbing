import 'server-only'

import { getDb } from '@/lib/db/client'

export async function upsertUser(user: {
  id: string
  email: string
  displayName: string | null
  photoURL: string | null
  accessToken: string | null
  refreshToken?: string | null
  tokenExpiresAt?: string | null
}) {
  const db = getDb()
  await db.execute({
    sql: `INSERT INTO users (id, email, display_name, photo_url, google_access_token, google_refresh_token, token_expires_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(id) DO UPDATE SET
            email = excluded.email,
            display_name = excluded.display_name,
            photo_url = excluded.photo_url,
            google_access_token = COALESCE(excluded.google_access_token, users.google_access_token),
            google_refresh_token = COALESCE(excluded.google_refresh_token, users.google_refresh_token),
            token_expires_at = COALESCE(excluded.token_expires_at, users.token_expires_at),
            updated_at = datetime('now')`,
    args: [
      user.id,
      user.email,
      user.displayName,
      user.photoURL,
      user.accessToken,
      user.refreshToken ?? null,
      user.tokenExpiresAt ?? null,
    ],
  })
}

export async function getUserTokens(userId: string) {
  const db = getDb()
  const result = await db.execute({
    sql: 'SELECT google_access_token, google_refresh_token, token_expires_at FROM users WHERE id = ?',
    args: [userId],
  })
  const row = result.rows[0]
  if (!row) return null
  return {
    accessToken: row.google_access_token as string | null,
    refreshToken: row.google_refresh_token as string | null,
    tokenExpiresAt: row.token_expires_at as string | null,
  }
}

export async function updateUserTokens(
  userId: string,
  accessToken: string,
  tokenExpiresAt: string,
) {
  const db = getDb()
  await db.execute({
    sql: `UPDATE users SET google_access_token = ?, token_expires_at = ?, updated_at = datetime('now') WHERE id = ?`,
    args: [accessToken, tokenExpiresAt, userId],
  })
}

export async function getUser(userId: string) {
  const db = getDb()
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE id = ?',
    args: [userId],
  })
  return result.rows[0] || null
}

export async function updateUserCredits(userId: string, credits: number) {
  const db = getDb()
  await db.execute({
    sql: `UPDATE users SET credits_remaining = ?, updated_at = datetime('now') WHERE id = ?`,
    args: [credits, userId],
  })
}

export async function deductUserMinutes(userId: string, minutes: number) {
  const db = getDb()
  await db.execute({
    sql: `UPDATE users SET credits_remaining = MAX(0, credits_remaining - ?), updated_at = datetime('now') WHERE id = ?`,
    args: [minutes, userId],
  })
}

export async function addUserCredits(userId: string, minutes: number) {
  const db = getDb()
  await db.execute({
    sql: `UPDATE users SET credits_remaining = credits_remaining + ?, updated_at = datetime('now') WHERE id = ?`,
    args: [minutes, userId],
  })
}
