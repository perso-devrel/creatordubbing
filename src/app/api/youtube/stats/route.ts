import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import {
  fetchChannelStatistics,
  fetchVideoStatistics,
} from '@/lib/youtube/server'
import {
  parseQuery,
  withTokenRetry,
  ytHandle,
} from '@/lib/youtube/route-helpers'
import { statsQuerySchema } from '@/lib/validators/youtube'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  return ytHandle(async () => {
    const url = new URL(req.url)
    const query = parseQuery(url, statsQuerySchema)

    if (query.channel === 'true') {
      return withTokenRetry(req, (accessToken) =>
        fetchChannelStatistics(accessToken),
      )
    }
    return withTokenRetry(req, (accessToken) =>
      fetchVideoStatistics(accessToken, query.videoIds),
    )
  })
}
