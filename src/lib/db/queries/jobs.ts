import 'server-only'

import { getDb } from '@/lib/db/client'

export async function createDubbingJob(job: {
  userId: string
  videoTitle: string
  videoDurationMs: number
  videoThumbnail: string
  sourceLanguage: string
  mediaSeq: number
  spaceSeq: number
  lipSyncEnabled: boolean
  isShort: boolean
}): Promise<number> {
  const db = getDb()
  const result = await db.execute({
    sql: `INSERT INTO dubbing_jobs (user_id, video_title, video_duration_ms, video_thumbnail, source_language, media_seq, space_seq, lip_sync_enabled, is_short, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'processing')`,
    args: [
      job.userId,
      job.videoTitle,
      job.videoDurationMs,
      job.videoThumbnail,
      job.sourceLanguage,
      job.mediaSeq,
      job.spaceSeq,
      job.lipSyncEnabled ? 1 : 0,
      job.isShort ? 1 : 0,
    ],
  })
  return Number(result.lastInsertRowid)
}

export async function createJobLanguages(
  jobId: number,
  languages: { code: string; projectSeq: number }[],
) {
  const db = getDb()
  await db.batch(
    languages.map((lang) => ({
      sql: 'INSERT INTO job_languages (job_id, language_code, project_seq) VALUES (?, ?, ?)',
      args: [jobId, lang.code, lang.projectSeq],
    })),
  )
}

export async function updateJobLanguageProgress(
  jobId: number,
  langCode: string,
  status: string,
  progress: number,
  progressReason: string,
) {
  const db = getDb()
  await db.execute({
    sql: 'UPDATE job_languages SET status = ?, progress = ?, progress_reason = ? WHERE job_id = ? AND language_code = ?',
    args: [status, progress, progressReason, jobId, langCode],
  })
}

export async function updateJobLanguageCompleted(
  jobId: number,
  langCode: string,
  urls: { dubbedVideoUrl?: string; audioUrl?: string; srtUrl?: string },
) {
  const db = getDb()
  await db.execute({
    sql: `UPDATE job_languages SET status = 'completed', progress = 100,
          dubbed_video_url = ?, audio_url = ?, srt_url = ?
          WHERE job_id = ? AND language_code = ?`,
    args: [
      urls.dubbedVideoUrl || null,
      urls.audioUrl || null,
      urls.srtUrl || null,
      jobId,
      langCode,
    ],
  })
}

export async function updateJobStatus(jobId: number, status: string) {
  const db = getDb()
  await db.execute({
    sql: `UPDATE dubbing_jobs SET status = ?, updated_at = datetime('now') WHERE id = ?`,
    args: [status, jobId],
  })
}

export async function deleteDubbingJob(jobId: number) {
  const db = getDb()
  await db.batch([
    { sql: 'DELETE FROM job_languages WHERE job_id = ?', args: [jobId] },
    { sql: 'DELETE FROM dubbing_jobs WHERE id = ?', args: [jobId] },
  ])
}
