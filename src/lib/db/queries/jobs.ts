import 'server-only'

import { getDb } from '@/lib/db/client'
import {
  parseJobUploadSettings,
  serializeJobUploadSettings,
  type PersistedDeliverableMode,
  type PersistedJobUploadSettings,
} from '@/lib/dubbing/job-upload-settings'
import { deleteGeneratedCaptionsForJob } from './generated-captions'
import { deleteSttCaptionSegmentsForJob } from './stt-segments'

export interface DubbingJobUploadSettingsInput {
  deliverableMode?: PersistedDeliverableMode
  uploadSettings?: unknown
  originalVideoUrl?: string | null
  originalYouTubeUrl?: string | null
}

export interface DubbingJobLanguageWorkItem {
  jobId: number
  userId: string
  videoTitle: string
  videoDurationMs: number
  isShort: boolean
  spaceSeq: number
  deliverableMode: PersistedDeliverableMode
  uploadSettings: PersistedJobUploadSettings
  languageCode: string
  projectSeq: number
  languageStatus: string
  progress: number
  progressReason: string
  dubbedVideoUrl: string | null
  audioUrl: string | null
  srtUrl: string | null
  youtubeVideoId: string | null
  youtubeUploadStatus: string | null
}

let durableWorkerColumnsEnsured = false

async function ensureDurableWorkerColumns() {
  if (durableWorkerColumnsEnsured) return
  const db = getDb()
  const result = await db.execute({ sql: 'PRAGMA table_info(dubbing_jobs)', args: [] })
  const existing = new Set(result.rows.map((row) => String(row.name)))
  const addColumn = async (name: string, definition: string) => {
    if (existing.has(name)) return
    await db.execute({ sql: `ALTER TABLE dubbing_jobs ADD COLUMN ${name} ${definition}`, args: [] })
  }
  await addColumn('upload_settings_json', 'TEXT')
  await addColumn('deliverable_mode', "TEXT NOT NULL DEFAULT 'newDubbedVideos'")
  await addColumn('original_video_url', 'TEXT')
  await addColumn('original_youtube_url', 'TEXT')
  durableWorkerColumnsEnsured = true
}

function buildUploadSettingsJson(job: DubbingJobUploadSettingsInput) {
  return serializeJobUploadSettings({
    deliverableMode: job.deliverableMode,
    uploadSettings: job.uploadSettings,
    originalVideoUrl: job.originalVideoUrl,
    originalYouTubeUrl: job.originalYouTubeUrl,
  })
}

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
} & DubbingJobUploadSettingsInput): Promise<number> {
  await ensureDurableWorkerColumns()
  const db = getDb()
  const result = await db.execute({
    sql: `INSERT INTO dubbing_jobs (
            user_id, video_title, video_duration_ms, video_thumbnail, source_language,
            media_seq, space_seq, lip_sync_enabled, is_short, status,
            upload_settings_json, deliverable_mode, original_video_url, original_youtube_url
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'processing', ?, ?, ?, ?)`,
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
      buildUploadSettingsJson(job),
      job.deliverableMode ?? 'newDubbedVideos',
      job.originalVideoUrl ?? null,
      job.originalYouTubeUrl ?? null,
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

export async function createDubbingJobWithLanguages(
  job: Parameters<typeof createDubbingJob>[0],
  languages: { code: string; projectSeq: number }[],
): Promise<number> {
  await ensureDurableWorkerColumns()
  const db = getDb()
  const result = await db.execute({
    sql: `INSERT INTO dubbing_jobs (
            user_id, video_title, video_duration_ms, video_thumbnail, source_language,
            media_seq, space_seq, lip_sync_enabled, is_short, status,
            upload_settings_json, deliverable_mode, original_video_url, original_youtube_url
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'processing', ?, ?, ?, ?)`,
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
      buildUploadSettingsJson(job),
      job.deliverableMode ?? 'newDubbedVideos',
      job.originalVideoUrl ?? null,
      job.originalYouTubeUrl ?? null,
    ],
  })
  const jobId = Number(result.lastInsertRowid)
  await createJobLanguages(jobId, languages)
  return jobId
}

export async function updateJobLanguageProjects(
  jobId: number,
  languages: { code: string; projectSeq: number }[],
) {
  if (languages.length === 0) return
  const db = getDb()
  for (const lang of languages) {
    const existing = await db.execute({
      sql: 'SELECT id FROM job_languages WHERE job_id = ? AND language_code = ? ORDER BY id LIMIT 1',
      args: [jobId, lang.code],
    })
    const id = existing.rows[0]?.id
    if (id !== undefined && id !== null) {
      await db.execute({
        sql: 'UPDATE job_languages SET project_seq = ? WHERE id = ?',
        args: [lang.projectSeq, id],
      })
    } else {
      await db.execute({
        sql: `INSERT INTO job_languages (job_id, language_code, project_seq, status, progress_reason)
              VALUES (?, ?, ?, 'pending', 'PENDING')`,
        args: [jobId, lang.code, lang.projectSeq],
      })
    }
  }
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
    sql: `UPDATE job_languages
          SET status = ?, progress = ?, progress_reason = ?, updated_at = datetime('now')
          WHERE job_id = ? AND language_code = ?`,
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
          progress_reason = 'COMPLETED',
          dubbed_video_url = ?, audio_url = ?, srt_url = ?, updated_at = datetime('now')
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

type DubbingJobLanguageWorkItemRow = Record<string, unknown>

function rowToDubbingJobLanguageWorkItem(row: DubbingJobLanguageWorkItemRow): DubbingJobLanguageWorkItem {
  const uploadSettings = parseJobUploadSettings(String(row.upload_settings_json ?? ''))
  const deliverableMode = (
    row.deliverable_mode === 'originalWithMultiAudio' || row.deliverable_mode === 'downloadOnly'
      ? row.deliverable_mode
      : 'newDubbedVideos'
  ) as PersistedDeliverableMode
  return {
    jobId: Number(row.job_id),
    userId: String(row.user_id),
    videoTitle: String(row.video_title ?? ''),
    videoDurationMs: Number(row.video_duration_ms ?? 0),
    isShort: Boolean(row.is_short),
    spaceSeq: Number(row.space_seq),
    deliverableMode,
    uploadSettings: {
      ...uploadSettings,
      deliverableMode,
      originalVideoUrl: row.original_video_url ? String(row.original_video_url) : uploadSettings.originalVideoUrl,
      originalYouTubeUrl: row.original_youtube_url ? String(row.original_youtube_url) : uploadSettings.originalYouTubeUrl,
    },
    languageCode: String(row.language_code),
    projectSeq: Number(row.project_seq),
    languageStatus: String(row.language_status ?? ''),
    progress: Number(row.progress ?? 0),
    progressReason: String(row.progress_reason ?? ''),
    dubbedVideoUrl: row.dubbed_video_url ? String(row.dubbed_video_url) : null,
    audioUrl: row.audio_url ? String(row.audio_url) : null,
    srtUrl: row.srt_url ? String(row.srt_url) : null,
    youtubeVideoId: row.youtube_video_id ? String(row.youtube_video_id) : null,
    youtubeUploadStatus: row.youtube_upload_status ? String(row.youtube_upload_status) : null,
  }
}

export async function getDubbingJobLanguageWorkItems(limit = 50): Promise<DubbingJobLanguageWorkItem[]> {
  await ensureDurableWorkerColumns()
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT
            dj.id as job_id,
            dj.user_id,
            dj.video_title,
            dj.video_duration_ms,
            dj.is_short,
            dj.space_seq,
            dj.deliverable_mode,
            dj.upload_settings_json,
            dj.original_video_url,
            dj.original_youtube_url,
            jl.language_code,
            jl.project_seq,
            jl.status as language_status,
            jl.progress,
            jl.progress_reason,
            jl.dubbed_video_url,
            jl.audio_url,
            jl.srt_url,
            jl.youtube_video_id,
            jl.youtube_upload_status
          FROM job_languages jl
          JOIN dubbing_jobs dj ON dj.id = jl.job_id
          WHERE COALESCE(jl.project_seq, 0) > 0
            AND dj.status != 'failed'
            AND (
              jl.status NOT IN ('completed', 'failed')
              OR (
                jl.status = 'completed'
                AND dj.deliverable_mode = 'newDubbedVideos'
                AND COALESCE(jl.youtube_video_id, '') = ''
                AND COALESCE(jl.youtube_upload_status, '') NOT IN ('uploaded', 'failed')
              )
            )
          ORDER BY jl.updated_at ASC, jl.created_at ASC
          LIMIT ?`,
    args: [limit],
  })
  return result.rows
    .map((row) => rowToDubbingJobLanguageWorkItem(row))
    .filter((item) => !(
      item.deliverableMode === 'originalWithMultiAudio' &&
      item.uploadSettings.uploadSettings.uploadCaptions &&
      item.uploadSettings.uploadSettings.captionGenerationMode === 'stt'
    ))
}

export async function getDubbingJobLanguageWorkItem(
  jobId: number,
  langCode: string,
): Promise<DubbingJobLanguageWorkItem | null> {
  await ensureDurableWorkerColumns()
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT
            dj.id as job_id,
            dj.user_id,
            dj.video_title,
            dj.video_duration_ms,
            dj.is_short,
            dj.space_seq,
            dj.deliverable_mode,
            dj.upload_settings_json,
            dj.original_video_url,
            dj.original_youtube_url,
            jl.language_code,
            jl.project_seq,
            jl.status as language_status,
            jl.progress,
            jl.progress_reason,
            jl.dubbed_video_url,
            jl.audio_url,
            jl.srt_url,
            jl.youtube_video_id,
            jl.youtube_upload_status
          FROM job_languages jl
          JOIN dubbing_jobs dj ON dj.id = jl.job_id
          WHERE jl.job_id = ? AND jl.language_code = ?
          LIMIT 1`,
    args: [jobId, langCode],
  })
  const row = result.rows[0]
  return row ? rowToDubbingJobLanguageWorkItem(row) : null
}

export async function getJobLanguageTerminalSummary(jobId: number) {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT
            COUNT(*) as total,
            SUM(CASE WHEN status = 'completed' OR progress_reason IN ('COMPLETED', 'Completed') THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN status = 'failed' OR progress_reason IN ('FAILED', 'Failed', 'CANCELED') THEN 1 ELSE 0 END) as failed,
            SUM(CASE WHEN status = 'completed'
                       OR progress_reason IN ('COMPLETED', 'Completed', 'FAILED', 'Failed', 'CANCELED')
                     THEN 1 ELSE 0 END) as terminal
          FROM job_languages
          WHERE job_id = ?`,
    args: [jobId],
  })
  const row = result.rows[0]
  return {
    total: Number(row?.total ?? 0),
    completed: Number(row?.completed ?? 0),
    failed: Number(row?.failed ?? 0),
    terminal: Number(row?.terminal ?? 0),
  }
}

export async function deleteDubbingJob(jobId: number) {
  const db = getDb()
  await deleteGeneratedCaptionsForJob(jobId)
  await deleteSttCaptionSegmentsForJob(jobId)
  await db.batch([
    { sql: 'DELETE FROM job_languages WHERE job_id = ?', args: [jobId] },
    { sql: 'DELETE FROM dubbing_jobs WHERE id = ?', args: [jobId] },
  ])
}
