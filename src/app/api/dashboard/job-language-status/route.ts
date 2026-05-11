import { NextRequest } from 'next/server'
import { getDb } from '@/lib/db/client'
import { requireSession } from '@/lib/auth/session'
import { apiFail, apiFailFromError, apiOk } from '@/lib/api/response'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  const jobId = Number.parseInt(req.nextUrl.searchParams.get('jobId') ?? '', 10)
  if (!Number.isInteger(jobId) || jobId <= 0) {
    return apiFail('BAD_REQUEST', 'jobId required', 400)
  }

  try {
    const db = getDb()
    const result = await db.execute({
      sql: `SELECT
              jl.language_code,
              jl.youtube_video_id,
              jl.youtube_upload_status
            FROM job_languages jl
            JOIN dubbing_jobs dj ON dj.id = jl.job_id
            WHERE jl.job_id = ? AND dj.user_id = ?
            ORDER BY jl.language_code ASC`,
      args: [jobId, auth.session.uid],
    })

    return apiOk({
      jobId,
      languages: result.rows.map((row) => ({
        languageCode: String(row.language_code),
        youtubeVideoId: row.youtube_video_id ? String(row.youtube_video_id) : null,
        youtubeUploadStatus: row.youtube_upload_status ? String(row.youtube_upload_status) : null,
      })),
    })
  } catch (err) {
    return apiFailFromError(err)
  }
}
