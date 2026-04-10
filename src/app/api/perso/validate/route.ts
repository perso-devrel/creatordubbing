import { persoFetch } from '@/lib/perso/client'
import { handle, readJson } from '@/lib/perso/route-helpers'
import type { MediaValidateRequest } from '@/lib/perso/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/perso/validate → POST /file/api/v1/media/validate
 *
 * Body (camelCase):
 *   { spaceSeq, durationMs, originalName, mediaType, extension, size, width, height }
 *
 * Known failure codes mapped via errors.ts:
 *   F4004 (size), F4008 (length), F4009 (too short), F40010 (resolution), F4005 (plan).
 */
export async function POST(req: Request) {
  return handle(async () => {
    const body = await readJson<MediaValidateRequest>(req)
    return persoFetch<{ valid?: boolean } | null>(
      '/file/api/v1/media/validate',
      {
        method: 'POST',
        baseURL: 'file',
        body,
      },
    )
  })
}
