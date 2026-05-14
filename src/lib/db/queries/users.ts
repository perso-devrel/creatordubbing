import 'server-only'

import { createHash } from 'node:crypto'
import type { Transaction } from '@libsql/client'
import { getDb } from '@/lib/db/client'
import { decryptToken, encryptToken } from '@/lib/auth/token-crypto'

const ACCOUNT_STATUS_ACTIVE = 'active'
const ACCOUNT_STATUS_PENDING_DELETION = 'pending_deletion'
const ACCOUNT_DELETION_DISPLAY_NAME = '회원탈퇴 요청'
const ACCOUNT_DELETION_EMAIL_DOMAIN = 'withdrawal.dubtube.local'
const ACCOUNT_DELETION_RECOVERY_DAYS = 7

function getDeletionRequestDigest(userId: string) {
  return createHash('sha256').update(userId).digest('hex').slice(0, 32)
}

function getDeletedUserId(userId: string) {
  return `deleted:${getDeletionRequestDigest(userId)}`
}

function getDeletionRequestEmail(userId: string) {
  return `withdrawal-requested+${getDeletionRequestDigest(userId)}@${ACCOUNT_DELETION_EMAIL_DOMAIN}`
}

function getDeletionRestoreExpiresAt(now = new Date()) {
  return new Date(now.getTime() + ACCOUNT_DELETION_RECOVERY_DAYS * 24 * 60 * 60 * 1000).toISOString()
}

function canRestorePendingDeletion(expiresAt: unknown): boolean {
  if (!expiresAt) return true
  const raw = String(expiresAt)
  const timestamp = Date.parse(raw.includes('T') ? raw : `${raw.replace(' ', 'T')}Z`)
  return Number.isNaN(timestamp) || timestamp >= Date.now()
}

async function clearAccountDeletionMarkers(tx: Transaction, userId: string) {
  await tx.execute({
    sql: 'UPDATE dubbing_jobs SET account_deletion_requested_at = NULL, updated_at = datetime(\'now\') WHERE user_id = ?',
    args: [userId],
  })
  await tx.execute({
    sql: `UPDATE job_languages
          SET account_deletion_requested_at = NULL, updated_at = datetime('now')
          WHERE job_id IN (SELECT id FROM dubbing_jobs WHERE user_id = ?)`,
    args: [userId],
  })
  await tx.execute({
    sql: `UPDATE youtube_uploads
          SET account_deletion_requested_at = NULL, updated_at = datetime('now')
          WHERE user_id = ?
             OR job_language_id IN (
               SELECT jl.id
               FROM job_languages jl
               JOIN dubbing_jobs dj ON dj.id = jl.job_id
               WHERE dj.user_id = ?
             )`,
    args: [userId, userId],
  })
  await tx.execute({
    sql: 'UPDATE analytics_cache SET account_deletion_requested_at = NULL WHERE user_id = ?',
    args: [userId],
  })
  await tx.execute({
    sql: 'UPDATE perso_media_resources SET account_deletion_requested_at = NULL, updated_at = datetime(\'now\') WHERE user_id = ?',
    args: [userId],
  })
  await tx.execute({
    sql: 'UPDATE upload_queue SET account_deletion_requested_at = NULL, updated_at = datetime(\'now\') WHERE user_id = ?',
    args: [userId],
  })
  await tx.execute({
    sql: 'UPDATE payment_orders SET account_deletion_requested_at = NULL, updated_at = datetime(\'now\') WHERE user_id = ?',
    args: [userId],
  })
  await tx.execute({
    sql: 'UPDATE credit_transactions SET account_deletion_requested_at = NULL WHERE user_id = ?',
    args: [userId],
  })
  await tx.execute({
    sql: 'UPDATE operational_events SET account_deletion_requested_at = NULL WHERE user_id = ?',
    args: [userId],
  })
}

async function purgeExpiredDeletedAccount(tx: Transaction, userId: string) {
  const deletedUserId = getDeletedUserId(userId)
  await tx.execute({
    sql: 'UPDATE payment_orders SET user_id = ?, account_deletion_requested_at = NULL WHERE user_id = ?',
    args: [deletedUserId, userId],
  })
  await tx.execute({
    sql: 'UPDATE credit_transactions SET user_id = ?, account_deletion_requested_at = NULL WHERE user_id = ?',
    args: [deletedUserId, userId],
  })
  await tx.execute({
    sql: 'UPDATE operational_events SET user_id = NULL, account_deletion_requested_at = NULL WHERE user_id = ?',
    args: [userId],
  })
  await tx.execute({
    sql: 'DELETE FROM app_sessions WHERE user_id = ?',
    args: [userId],
  })
  await tx.execute({
    sql: 'DELETE FROM upload_queue WHERE user_id = ?',
    args: [userId],
  })
  await tx.execute({
    sql: `DELETE FROM youtube_uploads
          WHERE user_id = ?
             OR job_language_id IN (
               SELECT jl.id
               FROM job_languages jl
               JOIN dubbing_jobs dj ON dj.id = jl.job_id
               WHERE dj.user_id = ?
             )`,
    args: [userId, userId],
  })
  await tx.execute({
    sql: 'DELETE FROM analytics_cache WHERE user_id = ?',
    args: [userId],
  })
  await tx.execute({
    sql: 'DELETE FROM job_languages WHERE job_id IN (SELECT id FROM dubbing_jobs WHERE user_id = ?)',
    args: [userId],
  })
  await tx.execute({
    sql: 'DELETE FROM dubbing_jobs WHERE user_id = ?',
    args: [userId],
  })
  await tx.execute({
    sql: 'DELETE FROM perso_media_resources WHERE user_id = ?',
    args: [userId],
  })
  await tx.execute({
    sql: 'DELETE FROM users WHERE id = ?',
    args: [userId],
  })
}

async function writeUser(
  tx: Transaction,
  user: {
    id: string
    email: string
    displayName: string | null
    photoURL: string | null
    accessToken: string | null
    refreshToken?: string | null
    tokenExpiresAt?: string | null
  },
  accessToken: string | null,
  refreshToken: string | null,
) {
  await tx.execute({
    sql: `INSERT INTO users (
            id, email, display_name, photo_url, google_access_token,
            google_refresh_token, token_expires_at, account_status,
            deletion_requested_at, deletion_restore_expires_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, datetime('now'))
          ON CONFLICT(id) DO UPDATE SET
            email = excluded.email,
            display_name = excluded.display_name,
            photo_url = excluded.photo_url,
            google_access_token = COALESCE(excluded.google_access_token, users.google_access_token),
            google_refresh_token = COALESCE(excluded.google_refresh_token, users.google_refresh_token),
            token_expires_at = COALESCE(excluded.token_expires_at, users.token_expires_at),
            account_status = excluded.account_status,
            deletion_requested_at = NULL,
            deletion_restore_expires_at = NULL,
            updated_at = datetime('now')`,
    args: [
      user.id,
      user.email,
      user.displayName,
      user.photoURL,
      accessToken,
      refreshToken,
      user.tokenExpiresAt ?? null,
      ACCOUNT_STATUS_ACTIVE,
    ],
  })
}

export async function upsertUser(user: {
  id: string
  email: string
  displayName: string | null
  photoURL: string | null
  accessToken: string | null
  refreshToken?: string | null
  tokenExpiresAt?: string | null
}) {
  const accessToken = await encryptToken(user.accessToken)
  const refreshToken = await encryptToken(user.refreshToken)
  const tx = await getDb().transaction('write')
  try {
    const existing = await tx.execute({
      sql: 'SELECT account_status, deletion_restore_expires_at FROM users WHERE id = ?',
      args: [user.id],
    })
    const row = existing.rows[0]
    if (row?.account_status === ACCOUNT_STATUS_PENDING_DELETION) {
      if (canRestorePendingDeletion(row.deletion_restore_expires_at)) {
        await clearAccountDeletionMarkers(tx, user.id)
      } else {
        await purgeExpiredDeletedAccount(tx, user.id)
      }
    }

    await writeUser(tx, user, accessToken, refreshToken)
    await tx.commit()
  } catch (err) {
    await tx.rollback().catch(() => {})
    throw err
  } finally {
    tx.close()
  }
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
    accessToken: await decryptToken(row.google_access_token as string | null),
    refreshToken: await decryptToken(row.google_refresh_token as string | null),
    tokenExpiresAt: row.token_expires_at as string | null,
  }
}

export async function updateUserTokens(
  userId: string,
  accessToken: string,
  tokenExpiresAt: string,
) {
  const db = getDb()
  const encryptedAccessToken = await encryptToken(accessToken)
  await db.execute({
    sql: `UPDATE users SET google_access_token = ?, token_expires_at = ?, updated_at = datetime('now') WHERE id = ?`,
    args: [encryptedAccessToken, tokenExpiresAt, userId],
  })
}

export async function clearUserGoogleTokens(userId: string) {
  const db = getDb()
  await db.execute({
    sql: `UPDATE users
          SET google_access_token = NULL,
              google_refresh_token = NULL,
              token_expires_at = NULL,
              updated_at = datetime('now')
          WHERE id = ?`,
    args: [userId],
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

export async function deductUserMinutes(userId: string, minutes: number) {
  const db = getDb()
  await db.execute({
    sql: `UPDATE users SET credits_remaining = MAX(0, credits_remaining - ?), updated_at = datetime('now') WHERE id = ?`,
    args: [minutes, userId],
  })
}

export async function getUserPreferencesRaw(userId: string): Promise<string | null> {
  const db = getDb()
  const result = await db.execute({
    sql: 'SELECT preferences FROM users WHERE id = ?',
    args: [userId],
  })
  const row = result.rows[0]
  if (!row) return null
  return (row.preferences as string | null) ?? null
}

export async function setUserPreferencesRaw(userId: string, preferences: string): Promise<void> {
  const db = getDb()
  await db.execute({
    sql: `UPDATE users SET preferences = ?, updated_at = datetime('now') WHERE id = ?`,
    args: [preferences, userId],
  })
}

export async function requestUserAccountDeletion(userId: string): Promise<void> {
  const requestedAt = new Date().toISOString()
  const restoreExpiresAt = getDeletionRestoreExpiresAt(new Date(requestedAt))
  const tx = await getDb().transaction('write')
  try {
    await tx.execute({
      sql: `UPDATE users
            SET account_status = ?,
                deletion_requested_at = ?,
                deletion_restore_expires_at = ?,
                email = ?,
                display_name = ?,
                photo_url = NULL,
                google_access_token = NULL,
                google_refresh_token = NULL,
                token_expires_at = NULL,
                updated_at = datetime('now')
            WHERE id = ?`,
      args: [
        ACCOUNT_STATUS_PENDING_DELETION,
        requestedAt,
        restoreExpiresAt,
        getDeletionRequestEmail(userId),
        ACCOUNT_DELETION_DISPLAY_NAME,
        userId,
      ],
    })
    await tx.execute({
      sql: 'UPDATE app_sessions SET revoked_at = datetime(\'now\'), updated_at = datetime(\'now\') WHERE user_id = ?',
      args: [userId],
    })
    await tx.execute({
      sql: 'UPDATE upload_queue SET account_deletion_requested_at = ?, updated_at = datetime(\'now\') WHERE user_id = ?',
      args: [requestedAt, userId],
    })
    await tx.execute({
      sql: 'UPDATE dubbing_jobs SET account_deletion_requested_at = ?, updated_at = datetime(\'now\') WHERE user_id = ?',
      args: [requestedAt, userId],
    })
    await tx.execute({
      sql: `UPDATE job_languages
            SET account_deletion_requested_at = ?, updated_at = datetime('now')
            WHERE job_id IN (SELECT id FROM dubbing_jobs WHERE user_id = ?)`,
      args: [requestedAt, userId],
    })
    await tx.execute({
      sql: `UPDATE youtube_uploads
            SET account_deletion_requested_at = ?, updated_at = datetime('now')
            WHERE user_id = ?
               OR job_language_id IN (
                 SELECT jl.id
                 FROM job_languages jl
                 JOIN dubbing_jobs dj ON dj.id = jl.job_id
                 WHERE dj.user_id = ?
               )`,
      args: [requestedAt, userId, userId],
    })
    await tx.execute({
      sql: 'UPDATE analytics_cache SET account_deletion_requested_at = ? WHERE user_id = ?',
      args: [requestedAt, userId],
    })
    await tx.execute({
      sql: 'UPDATE perso_media_resources SET account_deletion_requested_at = ?, updated_at = datetime(\'now\') WHERE user_id = ?',
      args: [requestedAt, userId],
    })
    await tx.execute({
      sql: 'UPDATE payment_orders SET account_deletion_requested_at = ?, updated_at = datetime(\'now\') WHERE user_id = ?',
      args: [requestedAt, userId],
    })
    await tx.execute({
      sql: 'UPDATE credit_transactions SET account_deletion_requested_at = ? WHERE user_id = ?',
      args: [requestedAt, userId],
    })
    await tx.execute({
      sql: 'UPDATE operational_events SET account_deletion_requested_at = ? WHERE user_id = ?',
      args: [requestedAt, userId],
    })
    await tx.commit()
  } catch (err) {
    await tx.rollback().catch(() => {})
    throw err
  } finally {
    tx.close()
  }
}
