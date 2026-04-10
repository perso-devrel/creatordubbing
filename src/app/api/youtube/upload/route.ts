import {
  uploadVideoToYouTube,
  YouTubeError,
} from '@/lib/youtube/server'
import {
  requireAccessToken,
  ytHandle,
} from '@/lib/youtube/route-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 600 // long uploads

/**
 * POST /api/youtube/upload
 *
 * Accepts multipart/form-data with:
 *   - video: File (required)
 *   - title: string
 *   - description: string
 *   - tags: string (comma-separated)
 *   - categoryId?: string
 *   - privacyStatus?: 'public' | 'unlisted' | 'private'
 *   - language?: string
 *
 * Auth: `Authorization: Bearer <google_access_token>` header required.
 */
export async function POST(req: Request) {
  return ytHandle(async () => {
    const accessToken = requireAccessToken(req)
    const form = await req.formData()

    const video = form.get('video')
    if (!(video instanceof Blob)) {
      throw new YouTubeError(400, 'Missing video file', 'MISSING_VIDEO')
    }

    const title = String(form.get('title') || '')
    const description = String(form.get('description') || '')
    const tagsRaw = String(form.get('tags') || '')
    const tags = tagsRaw
      ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
      : []

    const categoryId = (form.get('categoryId') as string) || undefined
    const privacyStatus = (form.get('privacyStatus') as
      | 'public'
      | 'unlisted'
      | 'private'
      | null) || undefined
    const language = (form.get('language') as string) || undefined

    return uploadVideoToYouTube({
      accessToken,
      videoBlob: video,
      title,
      description,
      tags,
      categoryId,
      privacyStatus: privacyStatus ?? undefined,
      language,
    })
  })
}
