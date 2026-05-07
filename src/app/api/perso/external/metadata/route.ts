import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { persoFetch } from '@/lib/perso/client'
import { handle, parseBody } from '@/lib/perso/route-helpers'
import { externalMetadataBodySchema } from '@/lib/validators/perso'
import type { ExternalMetadataResponse } from '@/lib/perso/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function externalRequestBody(spaceSeq: number, url: string, lang?: string) {
  const normalizedLang = lang?.trim()
  return {
    space_seq: spaceSeq,
    url,
    ...(normalizedLang && normalizedLang !== 'auto' ? { lang: normalizedLang } : {}),
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  return handle(async () => {
    const { spaceSeq, url, lang } = await parseBody(req, externalMetadataBodySchema)
    return persoFetch<ExternalMetadataResponse>(
      '/file/api/v1/video-translator/external/metadata',
      {
        method: 'POST',
        baseURL: 'file',
        body: externalRequestBody(spaceSeq, url, lang),
      },
    )
  })
}
