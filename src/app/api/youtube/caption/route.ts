import { uploadCaptionToYouTube } from '@/lib/youtube/server'
import {
  requireAccessToken,
  ytHandle,
} from '@/lib/youtube/route-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Body {
  videoId: string
  language: string
  name: string
  srtContent: string
}

/** POST /api/youtube/caption — upload SRT to existing video */
export async function POST(req: Request) {
  return ytHandle(async () => {
    const accessToken = requireAccessToken(req)
    const body = (await req.json()) as Body
    await uploadCaptionToYouTube({ accessToken, ...body })
    return { uploaded: true }
  })
}
