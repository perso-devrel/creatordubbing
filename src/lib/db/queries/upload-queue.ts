import 'server-only'

import { getDb } from '@/lib/db/client'

export type QueueStatus = 'pending' | 'processing' | 'done' | 'failed'

export interface UploadQueueItem {
  id: number
  userId: string
  jobId: number
  langCode: string
  videoUrl: string
  title: string
  description: string
  tags: string
  privacyStatus: string
  language: string
  isShort: boolean
  uploadCaptions: boolean
  captionLanguage: string | null
  captionName: string | null
  srtContent: string | null
  selfDeclaredMadeForKids: boolean
  containsSyntheticMedia: boolean
  status: QueueStatus
  retries: number
  error: string | null
  youtubeVideoId: string | null
  createdAt: string
}

export interface ClaimUploadQueueOptions {
  userId?: string
  queueId?: number
}

let tableEnsured = false

async function ensureTable() {
  if (tableEnsured) return
  const db = getDb()
  await db.execute({
    sql: `CREATE TABLE IF NOT EXISTS upload_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      job_id INTEGER NOT NULL,
      lang_code TEXT NOT NULL,
      video_url TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '',
      privacy_status TEXT NOT NULL DEFAULT 'private',
      language TEXT NOT NULL DEFAULT '',
      is_short INTEGER NOT NULL DEFAULT 0,
      upload_captions INTEGER NOT NULL DEFAULT 1,
      caption_language TEXT,
      caption_name TEXT,
      srt_content TEXT,
      self_declared_made_for_kids INTEGER NOT NULL DEFAULT 0,
      contains_synthetic_media INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      retries INTEGER NOT NULL DEFAULT 0,
      error TEXT,
      youtube_video_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    args: [],
  })
  const columns = await db.execute({
    sql: 'PRAGMA table_info(upload_queue)',
    args: [],
  })
  const existing = new Set(columns.rows.map((row) => String(row.name)))
  const addColumn = async (name: string, definition: string) => {
    if (existing.has(name)) return
    await db.execute({
      sql: `ALTER TABLE upload_queue ADD COLUMN ${name} ${definition}`,
      args: [],
    })
  }
  await addColumn('upload_captions', 'INTEGER NOT NULL DEFAULT 1')
  await addColumn('caption_language', 'TEXT')
  await addColumn('caption_name', 'TEXT')
  await addColumn('srt_content', 'TEXT')
  await addColumn('self_declared_made_for_kids', 'INTEGER NOT NULL DEFAULT 0')
  await addColumn('contains_synthetic_media', 'INTEGER NOT NULL DEFAULT 0')
  tableEnsured = true
}

export async function createUploadQueueItem(item: {
  userId: string
  jobId: number
  langCode: string
  videoUrl: string
  title: string
  description: string
  tags: string[]
  privacyStatus: string
  language: string
  isShort: boolean
  uploadCaptions?: boolean
  captionLanguage?: string | null
  captionName?: string | null
  srtContent?: string | null
  selfDeclaredMadeForKids?: boolean
  containsSyntheticMedia?: boolean
}): Promise<number> {
  await ensureTable()
  const db = getDb()
  const result = await db.execute({
    sql: `INSERT INTO upload_queue (
            user_id, job_id, lang_code, video_url, title, description, tags,
            privacy_status, language, is_short, upload_captions, caption_language,
            caption_name, srt_content, self_declared_made_for_kids, contains_synthetic_media
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      item.userId,
      item.jobId,
      item.langCode,
      item.videoUrl,
      item.title,
      item.description,
      item.tags.join(','),
      item.privacyStatus,
      item.language,
      item.isShort ? 1 : 0,
      (item.uploadCaptions ?? true) ? 1 : 0,
      item.captionLanguage ?? null,
      item.captionName ?? null,
      item.srtContent ?? null,
      item.selfDeclaredMadeForKids ? 1 : 0,
      item.containsSyntheticMedia ? 1 : 0,
    ],
  })
  return Number(result.lastInsertRowid)
}

export async function getPendingUploads(limit = 5): Promise<UploadQueueItem[]> {
  await ensureTable()
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT * FROM upload_queue WHERE status IN ('pending', 'failed') AND retries < 3 ORDER BY created_at ASC LIMIT ?`,
    args: [limit],
  })
  return result.rows.map(rowToItem)
}

export async function claimPendingUploads(
  limit = 5,
  options: ClaimUploadQueueOptions = {},
): Promise<UploadQueueItem[]> {
  await ensureTable()
  const db = getDb()
  const filters = [`(status = 'pending' OR (status = 'failed' AND retries < 3))`]
  const args: (string | number)[] = []

  if (options.userId) {
    filters.push('user_id = ?')
    args.push(options.userId)
  }

  if (options.queueId !== undefined) {
    filters.push('id = ?')
    args.push(options.queueId)
  }

  const result = await db.execute({
    sql: `UPDATE upload_queue
          SET status = 'processing',
              error = NULL,
              updated_at = datetime('now')
          WHERE id IN (
            SELECT id
            FROM upload_queue
            WHERE ${filters.join(' AND ')}
            ORDER BY created_at ASC
            LIMIT ?
          )
          AND (status = 'pending' OR (status = 'failed' AND retries < 3))
          RETURNING *`,
    args: [...args, limit],
  })
  return result.rows.map(rowToItem)
}

export async function completeQueueItem(id: number, youtubeVideoId: string): Promise<boolean> {
  await ensureTable()
  const db = getDb()
  const result = await db.execute({
    sql: `UPDATE upload_queue
          SET status = 'done',
              youtube_video_id = ?,
              error = NULL,
              updated_at = datetime('now')
          WHERE id = ? AND status = 'processing'
          RETURNING id`,
    args: [youtubeVideoId, id],
  })
  return Boolean(result.rows[0])
}

export async function failQueueItem(id: number, error: string): Promise<boolean> {
  await ensureTable()
  const db = getDb()
  const result = await db.execute({
    sql: `UPDATE upload_queue
          SET status = 'failed',
              error = ?,
              retries = retries + 1,
              updated_at = datetime('now')
          WHERE id = ? AND status = 'processing'
          RETURNING id`,
    args: [error, id],
  })
  return Boolean(result.rows[0])
}

export async function updateQueueItemStatus(
  id: number,
  status: QueueStatus,
  extra?: { error?: string; youtubeVideoId?: string },
) {
  await ensureTable()
  const db = getDb()
  if (extra?.youtubeVideoId) {
    await db.execute({
      sql: `UPDATE upload_queue SET status = ?, youtube_video_id = ?, error = NULL, updated_at = datetime('now') WHERE id = ?`,
      args: [status, extra.youtubeVideoId, id],
    })
  } else if (extra?.error) {
    await db.execute({
      sql: `UPDATE upload_queue SET status = ?, error = ?, retries = retries + 1, updated_at = datetime('now') WHERE id = ?`,
      args: [status, extra.error, id],
    })
  } else {
    await db.execute({
      sql: `UPDATE upload_queue SET status = ?, updated_at = datetime('now') WHERE id = ?`,
      args: [status, id],
    })
  }
}

export async function getUserQueueItems(userId: string): Promise<UploadQueueItem[]> {
  await ensureTable()
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT * FROM upload_queue WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
    args: [userId],
  })
  return result.rows.map(rowToItem)
}

function rowToItem(row: Record<string, unknown>): UploadQueueItem {
  return {
    id: Number(row.id),
    userId: String(row.user_id),
    jobId: Number(row.job_id),
    langCode: String(row.lang_code),
    videoUrl: String(row.video_url),
    title: String(row.title),
    description: String(row.description),
    tags: String(row.tags),
    privacyStatus: String(row.privacy_status),
    language: String(row.language),
    isShort: Boolean(row.is_short),
    uploadCaptions: Boolean(row.upload_captions),
    captionLanguage: row.caption_language ? String(row.caption_language) : null,
    captionName: row.caption_name ? String(row.caption_name) : null,
    srtContent: row.srt_content ? String(row.srt_content) : null,
    selfDeclaredMadeForKids: Boolean(row.self_declared_made_for_kids),
    containsSyntheticMedia: Boolean(row.contains_synthetic_media),
    status: String(row.status) as QueueStatus,
    retries: Number(row.retries),
    error: row.error ? String(row.error) : null,
    youtubeVideoId: row.youtube_video_id ? String(row.youtube_video_id) : null,
    createdAt: String(row.created_at),
  }
}
