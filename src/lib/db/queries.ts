import 'server-only'

import { getDb } from '@/lib/db/client'

// ─── Users ──────────────────────────────────────────────────────

export async function upsertUser(user: {
  id: string
  email: string
  displayName: string | null
  photoURL: string | null
  accessToken: string | null
}) {
  const db = getDb()
  await db.execute({
    sql: `INSERT INTO users (id, email, display_name, photo_url, google_access_token, updated_at)
          VALUES (?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(id) DO UPDATE SET
            email = excluded.email,
            display_name = excluded.display_name,
            photo_url = excluded.photo_url,
            google_access_token = excluded.google_access_token,
            updated_at = datetime('now')`,
    args: [
      user.id,
      user.email,
      user.displayName,
      user.photoURL,
      user.accessToken,
    ],
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

// ─── Dubbing Jobs ───────────────────────────────────────────────

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
  for (const lang of languages) {
    await db.execute({
      sql: 'INSERT INTO job_languages (job_id, language_code, project_seq) VALUES (?, ?, ?)',
      args: [jobId, lang.code, lang.projectSeq],
    })
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

// ─── YouTube Uploads ────────────────────────────────────────────

export async function createYouTubeUpload(upload: {
  userId: string
  jobLanguageId?: number
  youtubeVideoId: string
  title: string
  languageCode: string
  privacyStatus: string
  isShort: boolean
}): Promise<number> {
  const db = getDb()
  const result = await db.execute({
    sql: `INSERT INTO youtube_uploads (user_id, job_language_id, youtube_video_id, title, language_code, privacy_status, is_short)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      upload.userId,
      upload.jobLanguageId || null,
      upload.youtubeVideoId,
      upload.title,
      upload.languageCode,
      upload.privacyStatus,
      upload.isShort ? 1 : 0,
    ],
  })
  return Number(result.lastInsertRowid)
}

export async function updateYouTubeStats(
  youtubeVideoId: string,
  stats: { viewCount: number; likeCount: number; commentCount: number },
) {
  const db = getDb()
  await db.execute({
    sql: `UPDATE youtube_uploads SET view_count = ?, like_count = ?, comment_count = ?, last_stats_fetch = datetime('now')
          WHERE youtube_video_id = ?`,
    args: [
      stats.viewCount,
      stats.likeCount,
      stats.commentCount,
      youtubeVideoId,
    ],
  })
}

export async function updateJobLanguageYouTube(
  jobId: number,
  langCode: string,
  youtubeVideoId: string,
) {
  const db = getDb()
  await db.execute({
    sql: `UPDATE job_languages SET youtube_video_id = ?, youtube_upload_status = 'uploaded' WHERE job_id = ? AND language_code = ?`,
    args: [youtubeVideoId, jobId, langCode],
  })
}

// ─── Queries (Dashboard) ────────────────────────────────────────

export async function getUserDubbingJobs(userId: string, limit = 10) {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT dj.*, GROUP_CONCAT(jl.language_code) as languages,
          AVG(jl.progress) as avg_progress
          FROM dubbing_jobs dj
          LEFT JOIN job_languages jl ON jl.job_id = dj.id
          WHERE dj.user_id = ?
          GROUP BY dj.id
          ORDER BY dj.created_at DESC
          LIMIT ?`,
    args: [userId, limit],
  })
  return result.rows
}

export async function getUserSummary(userId: string) {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT
          COUNT(DISTINCT dj.id) as total_jobs,
          COALESCE(SUM(dj.video_duration_ms), 0) / 60000 as total_minutes,
          COUNT(DISTINCT CASE WHEN dj.status = 'processing' THEN dj.id END) as active_jobs,
          (SELECT credits_remaining FROM users WHERE id = ?) as credits_remaining
          FROM dubbing_jobs dj
          WHERE dj.user_id = ?`,
    args: [userId, userId],
  })
  return result.rows[0] || null
}

export async function getCreditUsageByMonth(userId: string) {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT strftime('%Y-%m', created_at) as month,
          COUNT(*) as job_count,
          SUM(video_duration_ms) / 60000 as minutes_used
          FROM dubbing_jobs
          WHERE user_id = ?
          GROUP BY month
          ORDER BY month DESC
          LIMIT 6`,
    args: [userId],
  })
  return result.rows
}

export async function getLanguagePerformance(userId: string) {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT yu.language_code,
          SUM(yu.view_count) as total_views,
          SUM(yu.like_count) as total_likes,
          COUNT(*) as upload_count
          FROM youtube_uploads yu
          WHERE yu.user_id = ?
          GROUP BY yu.language_code
          ORDER BY total_views DESC`,
    args: [userId],
  })
  return result.rows
}

export async function getUserYouTubeUploads(userId: string) {
  const db = getDb()
  const result = await db.execute({
    sql: 'SELECT * FROM youtube_uploads WHERE user_id = ? ORDER BY created_at DESC',
    args: [userId],
  })
  return result.rows
}
