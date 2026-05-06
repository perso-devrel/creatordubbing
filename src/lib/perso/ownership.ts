import 'server-only'

import { getDb } from '@/lib/db/client'
import { PersoError } from '@/lib/perso/errors'
import type { UploadVideoResponse } from '@/lib/perso/types'

let ownershipTablesReady = false

async function ensureOwnershipTables() {
  if (ownershipTablesReady) return
  const db = getDb()
  await db.batch([
    {
      sql: `CREATE TABLE IF NOT EXISTS perso_media_resources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        space_seq INTEGER NOT NULL,
        media_seq INTEGER NOT NULL UNIQUE,
        source_type TEXT NOT NULL,
        original_name TEXT,
        file_url TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_perso_media_resources_user
        ON perso_media_resources (user_id, created_at DESC)`,
      args: [],
    },
  ])
  ownershipTablesReady = true
}

function notFound() {
  return new PersoError('PERSO_RESOURCE_NOT_FOUND', 'Perso resource not found', 404)
}

function forbidden() {
  return new PersoError('PERSO_RESOURCE_FORBIDDEN', 'You do not own this Perso resource', 403)
}

export async function recordPersoMediaOwner(args: {
  userId: string
  spaceSeq: number
  media: UploadVideoResponse
  sourceType: 'external' | 'upload'
  fileUrl?: string
}) {
  await ensureOwnershipTables()
  await getDb().execute({
    sql: `INSERT INTO perso_media_resources
          (user_id, space_seq, media_seq, source_type, original_name, file_url, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(media_seq) DO UPDATE SET
            user_id = excluded.user_id,
            space_seq = excluded.space_seq,
            source_type = excluded.source_type,
            original_name = excluded.original_name,
            file_url = excluded.file_url,
            updated_at = datetime('now')`,
    args: [
      args.userId,
      args.spaceSeq,
      args.media.seq,
      args.sourceType,
      args.media.originalName || null,
      args.fileUrl || args.media.videoFilePath || null,
    ],
  })
}

export async function assertPersoMediaOwner(userId: string, mediaSeq: number) {
  await ensureOwnershipTables()
  const db = getDb()
  const resource = await db.execute({
    sql: `SELECT user_id FROM perso_media_resources WHERE media_seq = ?`,
    args: [mediaSeq],
  })
  const resourceOwner = resource.rows[0]?.user_id
  if (resourceOwner) {
    if (resourceOwner !== userId) throw forbidden()
    return
  }

  const job = await db.execute({
    sql: `SELECT user_id FROM dubbing_jobs WHERE media_seq = ? LIMIT 1`,
    args: [mediaSeq],
  })
  const jobOwner = job.rows[0]?.user_id
  if (!jobOwner) throw notFound()
  if (jobOwner !== userId) throw forbidden()
}

export async function assertPersoProjectOwner(userId: string, projectSeq: number) {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT dj.user_id
          FROM job_languages jl
          JOIN dubbing_jobs dj ON dj.id = jl.job_id
          WHERE jl.project_seq = ?
          LIMIT 1`,
    args: [projectSeq],
  })
  const owner = result.rows[0]?.user_id
  if (!owner) throw notFound()
  if (owner !== userId) throw forbidden()
}
