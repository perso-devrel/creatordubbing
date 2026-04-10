import { NextRequest } from 'next/server'
import { getLanguagePerformance, getUserYouTubeUploads, updateYouTubeStats } from '@/lib/db/queries'
import { fetchVideoStatistics } from '@/lib/youtube/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const uid = req.nextUrl.searchParams.get('uid')
  const accessToken = req.headers.get('x-google-access-token')
  if (!uid) {
    return Response.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'uid required' } }, { status: 400 })
  }
  try {
    const dbData = await getLanguagePerformance(uid)

    if (accessToken) {
      try {
        const uploads = await getUserYouTubeUploads(uid)
        const videoIds = uploads
          .map((u) => (u as Record<string, unknown>).youtube_video_id as string)
          .filter(Boolean)

        if (videoIds.length > 0) {
          const stats = await fetchVideoStatistics(accessToken, videoIds)
          for (const s of stats) {
            await updateYouTubeStats(s.videoId, {
              viewCount: s.viewCount,
              likeCount: s.likeCount,
              commentCount: s.commentCount,
            })
          }
          const refreshed = await getLanguagePerformance(uid)
          return Response.json({ ok: true, data: refreshed })
        }
      } catch {
        // YouTube refresh failed — return DB data
      }
    }

    return Response.json({ ok: true, data: dbData })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return Response.json({ ok: false, error: { code: 'DB_ERROR', message } }, { status: 500 })
  }
}
