import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { fetchMyVideos } from '@/lib/youtube/server'
import {
  requireAccessToken,
  parseQuery,
  ytHandle,
} from '@/lib/youtube/route-helpers'
import { videosQuerySchema } from '@/lib/validators/youtube'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  return ytHandle(async () => {
    const accessToken = await requireAccessToken(req)
    const url = new URL(req.url)
    const { maxResults } = parseQuery(url, videosQuerySchema)
    return fetchMyVideos(accessToken, maxResults)
  })
}
