import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { persoFetch } from '@/lib/perso/client'
import { handle, parseBody } from '@/lib/perso/route-helpers'
import { externalMetadataBodySchema } from '@/lib/validators/perso'
import type { ExternalMetadataResponse } from '@/lib/perso/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  return handle(async () => {
    const { spaceSeq, url, lang = 'ko' } = await parseBody(req, externalMetadataBodySchema)
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
