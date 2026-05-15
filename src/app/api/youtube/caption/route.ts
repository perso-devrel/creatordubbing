import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import {
  listCaptionsForVideo,
  uploadCaptionToYouTube,
} from '@/lib/youtube/server'
import {
  parseQuery,
  parseYtBody,
  withTokenRetry,
  ytHandle,
} from '@/lib/youtube/route-helpers'
import {
  captionBodySchema,
  captionListQuerySchema,
} from '@/lib/validators/youtube'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  return ytHandle(async () => {
    const url = new URL(req.url)
    const { videoId } = parseQuery(url, captionListQuerySchema)
    const items = await withTokenRetry(req, (accessToken) =>
      listCaptionsForVideo(accessToken, videoId),
    )
    // YouTube의 캡션 언어는 BCP-47. 표시용 이름까지 같이 내려준다.
    const captions = items.map((item) => ({
      id: item.id,
      language: item.snippet?.language ?? '',
      name: item.snippet?.name ?? '',
    }))
    return { captions }
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  return ytHandle(async () => {
    const body = await parseYtBody(req, captionBodySchema)
    await withTokenRetry(req, (accessToken) =>
      uploadCaptionToYouTube({ accessToken, ...body }),
    )
    return { uploaded: true }
  })
}
