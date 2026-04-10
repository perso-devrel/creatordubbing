import { persoFetch } from '@/lib/perso/client'
import { handle, readJson } from '@/lib/perso/route-helpers'
import type { ExternalMetadataResponse } from '@/lib/perso/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Body {
  spaceSeq: number
  url: string
  lang?: string
}

/**
 * POST /api/perso/external/metadata
 *  → POST /file/api/v1/video-translator/external/metadata
 *
 * NOTE: Perso expects snake_case body: { space_seq, url, lang }
 */
export async function POST(req: Request) {
  return handle(async () => {
    const { spaceSeq, url, lang = 'ko' } = await readJson<Body>(req)
    return persoFetch<ExternalMetadataResponse>(
      '/file/api/v1/video-translator/external/metadata',
      {
        method: 'POST',
        baseURL: 'file',
        body: { space_seq: spaceSeq, url, lang },
      },
    )
  })
}
