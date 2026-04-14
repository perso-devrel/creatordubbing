import 'server-only'

import { getDb } from '@/lib/db/client'
import type { Row } from '@libsql/client'
import type {
  DashboardSummary,
  DubbingJob,
  CreditUsageRow,
  LanguagePerformanceRow,
} from '@/features/dashboard/components/types'

export interface YouTubeUploadRow {
  youtube_video_id: string
  [key: string]: Row[string]
}

export async function getUserDubbingJobs(userId: string, limit = 10): Promise<DubbingJob[]> {
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
  return result.rows as unknown as DubbingJob[]
}

export async function getUserSummary(userId: string): Promise<DashboardSummary | null> {
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
  return (result.rows[0] as unknown as DashboardSummary) || null
}

export async function getCreditUsageByMonth(userId: string): Promise<CreditUsageRow[]> {
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
  return result.rows as unknown as CreditUsageRow[]
}

export async function getLanguagePerformance(userId: string): Promise<LanguagePerformanceRow[]> {
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
  return result.rows as unknown as LanguagePerformanceRow[]
}

export async function getUserYouTubeUploads(userId: string): Promise<YouTubeUploadRow[]> {
  const db = getDb()
  const result = await db.execute({
    sql: 'SELECT * FROM youtube_uploads WHERE user_id = ? ORDER BY created_at DESC',
    args: [userId],
  })
  return result.rows as unknown as YouTubeUploadRow[]
}
