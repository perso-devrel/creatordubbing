import 'server-only'

import { getDb } from '@/lib/db/client'

export interface SttCaptionSegment {
  id: number
  userId: string
  jobId: number
  segmentIndex: number
  logicalStartMs: number
  logicalEndMs: number
  exportStartMs: number
  exportEndMs: number
  mediaSeq: number
  projectSeq: number
  status: string
  progress: number
  progressReason: string
  attemptCount: number
  lastError: string | null
}

let sttCaptionSegmentsReady = false

async function ensureSttCaptionSegmentsTable() {
  if (sttCaptionSegmentsReady) return
  const db = getDb()
  await db.batch([
    {
      sql: `CREATE TABLE IF NOT EXISTS stt_caption_segments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        job_id INTEGER NOT NULL,
        segment_index INTEGER NOT NULL,
        logical_start_ms INTEGER NOT NULL,
        logical_end_ms INTEGER NOT NULL,
        export_start_ms INTEGER NOT NULL,
        export_end_ms INTEGER NOT NULL,
        media_seq INTEGER NOT NULL DEFAULT 0,
        project_seq INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        progress INTEGER NOT NULL DEFAULT 0,
        progress_reason TEXT NOT NULL DEFAULT 'PENDING',
        attempt_count INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (job_id) REFERENCES dubbing_jobs(id) ON DELETE CASCADE,
        UNIQUE (job_id, segment_index)
      )`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_stt_caption_segments_job
        ON stt_caption_segments (job_id, segment_index)`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_stt_caption_segments_project
        ON stt_caption_segments (project_seq)`,
      args: [],
    },
  ])
  const columns = await db.execute({ sql: 'PRAGMA table_info(stt_caption_segments)', args: [] })
  const existing = new Set(columns.rows.map((row) => String(row.name)))
  if (!existing.has('attempt_count')) {
    await db.execute({
      sql: 'ALTER TABLE stt_caption_segments ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0',
      args: [],
    })
  }
  if (!existing.has('last_error')) {
    await db.execute({
      sql: 'ALTER TABLE stt_caption_segments ADD COLUMN last_error TEXT',
      args: [],
    })
  }
  sttCaptionSegmentsReady = true
}

function rowToSttCaptionSegment(row: Record<string, unknown>): SttCaptionSegment {
  return {
    id: Number(row.id),
    userId: String(row.user_id),
    jobId: Number(row.job_id),
    segmentIndex: Number(row.segment_index),
    logicalStartMs: Number(row.logical_start_ms),
    logicalEndMs: Number(row.logical_end_ms),
    exportStartMs: Number(row.export_start_ms),
    exportEndMs: Number(row.export_end_ms),
    mediaSeq: Number(row.media_seq),
    projectSeq: Number(row.project_seq),
    status: String(row.status),
    progress: Number(row.progress ?? 0),
    progressReason: String(row.progress_reason ?? 'PENDING'),
    attemptCount: Number(row.attempt_count ?? 0),
    lastError: row.last_error == null ? null : String(row.last_error),
  }
}

export async function upsertSttCaptionSegments(items: Array<{
  userId: string
  jobId: number
  segmentIndex: number
  logicalStartMs: number
  logicalEndMs: number
  exportStartMs: number
  exportEndMs: number
  mediaSeq: number
  projectSeq: number
  status?: string
  progress?: number
  progressReason?: string
  attemptCount?: number
  lastError?: string | null
}>) {
  if (items.length === 0) return
  await ensureSttCaptionSegmentsTable()
  await getDb().batch(items.map((item) => ({
    sql: `INSERT INTO stt_caption_segments (
            user_id, job_id, segment_index, logical_start_ms, logical_end_ms,
            export_start_ms, export_end_ms, media_seq, project_seq,
            status, progress, progress_reason, attempt_count, last_error, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(job_id, segment_index) DO UPDATE SET
            user_id = excluded.user_id,
            logical_start_ms = excluded.logical_start_ms,
            logical_end_ms = excluded.logical_end_ms,
            export_start_ms = excluded.export_start_ms,
            export_end_ms = excluded.export_end_ms,
            media_seq = excluded.media_seq,
            project_seq = excluded.project_seq,
            status = excluded.status,
            progress = excluded.progress,
            progress_reason = excluded.progress_reason,
            attempt_count = COALESCE(stt_caption_segments.attempt_count, excluded.attempt_count),
            last_error = COALESCE(excluded.last_error, stt_caption_segments.last_error),
            updated_at = datetime('now')`,
    args: [
      item.userId,
      item.jobId,
      item.segmentIndex,
      item.logicalStartMs,
      item.logicalEndMs,
      item.exportStartMs,
      item.exportEndMs,
      item.mediaSeq,
      item.projectSeq,
      item.status ?? 'pending',
      item.progress ?? 0,
      item.progressReason ?? 'PENDING',
      item.attemptCount ?? 0,
      item.lastError ?? null,
    ],
  })))
}

export async function getSttCaptionSegments(jobId: number): Promise<SttCaptionSegment[]> {
  await ensureSttCaptionSegmentsTable()
  const result = await getDb().execute({
    sql: `SELECT *
          FROM stt_caption_segments
          WHERE job_id = ?
          ORDER BY segment_index ASC`,
    args: [jobId],
  })
  return result.rows.map((row) => rowToSttCaptionSegment(row))
}

export async function claimSttCaptionSegmentPreparation(
  jobId: number,
  segmentIndex: number,
  maxAttempts: number,
) {
  await ensureSttCaptionSegmentsTable()
  const result = await getDb().execute({
    sql: `UPDATE stt_caption_segments
          SET status = 'preparing',
              progress = 0,
              progress_reason = 'STT_SEGMENT_PREPARING',
              attempt_count = attempt_count + 1,
              last_error = NULL,
              updated_at = datetime('now')
          WHERE job_id = ?
            AND segment_index = ?
            AND COALESCE(project_seq, 0) = 0
            AND attempt_count < ?
            AND (
              status IN ('pending', 'planned', 'failed')
              OR (status = 'preparing' AND updated_at < datetime('now', '-15 minutes'))
            )`,
    args: [jobId, segmentIndex, maxAttempts],
  })
  return Number(result.rowsAffected ?? 0) > 0
}

export async function completeSttCaptionSegmentPreparation(
  jobId: number,
  segmentIndex: number,
  values: {
    mediaSeq: number
    projectSeq: number
    progressReason?: string
  },
) {
  await ensureSttCaptionSegmentsTable()
  await getDb().execute({
    sql: `UPDATE stt_caption_segments
          SET media_seq = ?,
              project_seq = ?,
              status = 'transcribing',
              progress = 0,
              progress_reason = ?,
              last_error = NULL,
              updated_at = datetime('now')
          WHERE job_id = ? AND segment_index = ?`,
    args: [values.mediaSeq, values.projectSeq, values.progressReason ?? 'PENDING', jobId, segmentIndex],
  })
}

export async function markSttCaptionSegmentPreparationFailed(
  jobId: number,
  segmentIndex: number,
  values: {
    retryable: boolean
    error: string
  },
) {
  await ensureSttCaptionSegmentsTable()
  await getDb().execute({
    sql: `UPDATE stt_caption_segments
          SET status = ?,
              progress = 0,
              progress_reason = ?,
              last_error = ?,
              updated_at = datetime('now')
          WHERE job_id = ? AND segment_index = ?`,
    args: [
      values.retryable ? 'pending' : 'failed',
      values.retryable ? 'STT_SEGMENT_PREP_RETRY' : 'FAILED',
      values.error.slice(0, 2000),
      jobId,
      segmentIndex,
    ],
  })
}

export async function updateSttCaptionSegmentProgress(
  jobId: number,
  segmentIndex: number,
  status: string,
  progress: number,
  progressReason: string,
) {
  await ensureSttCaptionSegmentsTable()
  await getDb().execute({
    sql: `UPDATE stt_caption_segments
          SET status = ?, progress = ?, progress_reason = ?, updated_at = datetime('now')
          WHERE job_id = ? AND segment_index = ?`,
    args: [status, progress, progressReason, jobId, segmentIndex],
  })
}

export async function deleteSttCaptionSegmentsForJob(jobId: number) {
  await ensureSttCaptionSegmentsTable()
  await getDb().execute({
    sql: 'DELETE FROM stt_caption_segments WHERE job_id = ?',
    args: [jobId],
  })
}
