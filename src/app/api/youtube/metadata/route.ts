import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { fetchVideoMetadata, updateVideoLocalizations } from '@/lib/youtube/server'
import {
  parseQuery,
  parseYtBody,
  withTokenRetry,
  ytHandle,
} from '@/lib/youtube/route-helpers'
import {
  metadataQuerySchema,
  metadataUpdateBodySchema,
} from '@/lib/validators/youtube'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  return ytHandle(async () => {
    const url = new URL(req.url)
    const { videoId, sourceLang } = parseQuery(url, metadataQuerySchema)
    return withTokenRetry(req, (accessToken) =>
      sourceLang
        ? fetchVideoMetadata(accessToken, videoId, sourceLang)
        : fetchVideoMetadata(accessToken, videoId),
    )
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  return ytHandle(async () => {
    const body = await parseYtBody(req, metadataUpdateBodySchema)
    return withTokenRetry(req, (accessToken) =>
      updateVideoLocalizations({
        accessToken,
        videoId: body.videoId,
        sourceLang: body.sourceLang,
        title: body.title,
        description: body.description,
        tags: body.tags,
        localizations: body.localizations,
      }),
    )
  })
}
