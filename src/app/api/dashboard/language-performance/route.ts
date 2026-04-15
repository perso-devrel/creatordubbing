import { NextRequest } from 'next/server'
import { getLanguagePerformance, getUserYouTubeUploads, updateYouTubeStats } from '@/lib/db/queries'
import { fetchVideoStatistics } from '@/lib/youtube/server'
import { requireSession, forbiddenUidMismatch } from '@/lib/auth/session'
import { languagePerformanceQuerySchema } from '@/lib/validators/dashboard'
import { apiOk, apiFail, apiFailFromError } from '@/lib/api/response'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type YouTubeUploadRow = Record<string, unknown> & {
  youtube_video_id?: string | null
}

export async function GET(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  const parsed = languagePerformanceQuerySchema.safeParse({
    uid: req.nextUrl.searchParams.get('uid'),
  })
  if (!parsed.success) {
    return apiFail('BAD_REQUEST', 'uid required', 400)
  }

  if (parsed.data.uid !== auth.session.uid) return forbiddenUidMismatch()

  const uid = auth.session.uid
  const accessToken = req.cookies.get('google_access_token')?.value || req.headers.get('x-google-access-token')

  try {
    const dbData = await getLanguagePerformance(uid)

    if (accessToken) {
      try {
        const uploads = await getUserYouTubeUploads(uid)
        const videoIds = uploads
          .map((u) => (u as YouTubeUploadRow).youtube_video_id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)

        if (videoIds.length > 0) {
          const stats = await fetchVideoStatistics(accessToken, videoIds)
          await Promise.all(
            stats.map((s) =>
              updateYouTubeStats(s.videoId, {
                viewCount: s.viewCount,
                likeCount: s.likeCount,
                commentCount: s.commentCount,
              }),
            ),
          )
          const refreshed = await getLanguagePerformance(uid)
          return apiOk(refreshed)
        }
      } catch {
        // YouTube refresh failed — return DB data
      }
    }

    return apiOk(dbData)
  } catch (err) {
    return apiFailFromError(err)
  }
}
