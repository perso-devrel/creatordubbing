import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import {
  uploadVideoToYouTube,
  YouTubeError,
} from '@/lib/youtube/server'
import {
  requireAccessToken,
  ytHandle,
} from '@/lib/youtube/route-helpers'
import { uploadFormSchema } from '@/lib/validators/youtube'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  return ytHandle(async () => {
    const accessToken = await requireAccessToken(req)
    const form = await req.formData()

    const video = form.get('video')
    if (!(video instanceof Blob)) {
      throw new YouTubeError(400, 'Missing video file', 'MISSING_VIDEO')
    }

    const rawFields = {
      title: String(form.get('title') || ''),
      description: String(form.get('description') || ''),
      tags: String(form.get('tags') || ''),
      categoryId: (form.get('categoryId') as string) || undefined,
      privacyStatus: (form.get('privacyStatus') as string) || undefined,
      language: (form.get('language') as string) || undefined,
    }

    const fields = uploadFormSchema.parse(rawFields)

    return uploadVideoToYouTube({
      accessToken,
      videoBlob: video,
      title: fields.title,
      description: fields.description,
      tags: fields.tags,
      categoryId: fields.categoryId,
      privacyStatus: fields.privacyStatus,
      language: fields.language,
    })
  })
}
