import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { uploadCaptionToYouTube } from '@/lib/youtube/server'
import {
  parseYtBody,
  withTokenRetry,
  ytHandle,
} from '@/lib/youtube/route-helpers'
import { captionBodySchema } from '@/lib/validators/youtube'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
