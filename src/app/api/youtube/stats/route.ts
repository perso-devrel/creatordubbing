import {
  fetchChannelStatistics,
  fetchVideoStatistics,
} from '@/lib/youtube/server'
import {
  requireAccessToken,
  ytHandle,
} from '@/lib/youtube/route-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/youtube/stats?videoIds=a,b,c    → video statistics
 * GET /api/youtube/stats?channel=true      → authenticated user's channel stats
 */
export async function GET(req: Request) {
  return ytHandle(async () => {
    const accessToken = requireAccessToken(req)
    const url = new URL(req.url)

    if (url.searchParams.get('channel') === 'true') {
      return fetchChannelStatistics(accessToken)
    }

    const videoIds = (url.searchParams.get('videoIds') || '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
    return fetchVideoStatistics(accessToken, videoIds)
  })
}
