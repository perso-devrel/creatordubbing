import 'server-only'

import { getDb } from '@/lib/db/client'

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
