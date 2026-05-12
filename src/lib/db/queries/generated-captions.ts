import 'server-only'

import { getDb } from '@/lib/db/client'

export interface GeneratedCaption {
  userId: string
  jobId: number
  languageCode: string
  sourceProjectSeq: number | null
  sourceType: string
  srtContent: string
  cueCount: number
}

let generatedCaptionTablesReady = false

async function ensureGeneratedCaptionTables() {
  if (generatedCaptionTablesReady) return
  const db = getDb()
  await db.batch([
    {
      sql: `CREATE TABLE IF NOT EXISTS generated_captions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        job_id INTEGER NOT NULL,
        language_code TEXT NOT NULL,
        source_project_seq INTEGER,
        source_type TEXT NOT NULL DEFAULT 'stt',
        srt_content TEXT NOT NULL,
        cue_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (job_id) REFERENCES dubbing_jobs(id) ON DELETE CASCADE,
        UNIQUE (job_id, language_code)
      )`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_generated_captions_user_created
        ON generated_captions (user_id, created_at DESC)`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_generated_captions_job_language
        ON generated_captions (job_id, language_code)`,
      args: [],
    },
  ])
  generatedCaptionTablesReady = true
}

export async function upsertGeneratedCaption(args: {
  userId: string
  jobId: number
  languageCode: string
  sourceProjectSeq?: number | null
  sourceType?: string
  srtContent: string
  cueCount: number
}) {
  await ensureGeneratedCaptionTables()
  await getDb().execute({
    sql: `INSERT INTO generated_captions
          (user_id, job_id, language_code, source_project_seq, source_type, srt_content, cue_count, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(job_id, language_code) DO UPDATE SET
            user_id = excluded.user_id,
            source_project_seq = excluded.source_project_seq,
            source_type = excluded.source_type,
            srt_content = excluded.srt_content,
            cue_count = excluded.cue_count,
            updated_at = datetime('now')`,
    args: [
      args.userId,
      args.jobId,
      args.languageCode,
      args.sourceProjectSeq ?? null,
      args.sourceType ?? 'stt',
      args.srtContent,
      args.cueCount,
    ],
  })
}

export async function getGeneratedCaption(jobId: number, languageCode: string): Promise<GeneratedCaption | null> {
  await ensureGeneratedCaptionTables()
  const result = await getDb().execute({
    sql: `SELECT user_id, job_id, language_code, source_project_seq, source_type, srt_content, cue_count
          FROM generated_captions
          WHERE job_id = ? AND language_code = ?
          LIMIT 1`,
    args: [jobId, languageCode],
  })
  const row = result.rows[0]
  if (!row) return null
  return {
    userId: String(row.user_id),
    jobId: Number(row.job_id),
    languageCode: String(row.language_code),
    sourceProjectSeq: row.source_project_seq == null ? null : Number(row.source_project_seq),
    sourceType: String(row.source_type),
    srtContent: String(row.srt_content),
    cueCount: Number(row.cue_count ?? 0),
  }
}

export async function deleteGeneratedCaptionsForJob(jobId: number) {
  await ensureGeneratedCaptionTables()
  await getDb().execute({
    sql: 'DELETE FROM generated_captions WHERE job_id = ?',
    args: [jobId],
  })
}
