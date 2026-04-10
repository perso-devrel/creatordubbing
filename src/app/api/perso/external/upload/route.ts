import { persoFetch } from '@/lib/perso/client'
import { handle, readJson } from '@/lib/perso/route-helpers'
import type { UploadVideoResponse } from '@/lib/perso/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// External upload may take up to 10 minutes; extend Vercel function timeout.
export const maxDuration = 600

interface Body {
  spaceSeq: number
  url: string
  lang?: string
}

/**
 * PUT /api/perso/external/upload
 *   → PUT /file/api/upload/video/external
 *
 * NOTE: Perso expects snake_case body: { space_seq, url, lang }.
 * This call is SYNCHRONOUS on the Perso side and may take up to 10 minutes
 * while Perso downloads the YouTube video. We set a 10-minute timeout.
 */
export async function PUT(req: Request) {
  return handle(async () => {
    const { spaceSeq, url, lang = 'ko' } = await readJson<Body>(req)
    return persoFetch<UploadVideoResponse>(
      '/file/api/upload/video/external',
      {
        method: 'PUT',
        baseURL: 'file',
        body: { space_seq: spaceSeq, url, lang },
        timeoutMs: 600_000,
      },
    )
  })
}
