import { fetchMyVideos } from '@/lib/youtube/server'
import {
  requireAccessToken,
  ytHandle,
} from '@/lib/youtube/route-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/youtube/videos?maxResults=10
 * Returns the authenticated user's most recent uploads.
 */
export async function GET(req: Request) {
  return ytHandle(async () => {
    const accessToken = requireAccessToken(req)
    const url = new URL(req.url)
    const maxResults = Number(url.searchParams.get('maxResults') || '10')
    return fetchMyVideos(accessToken, maxResults)
  })
}
