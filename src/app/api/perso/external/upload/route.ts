import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { persoFetch } from '@/lib/perso/client'
import { handle, parseBody } from '@/lib/perso/route-helpers'
import { externalUploadBodySchema } from '@/lib/validators/perso'
import type { UploadVideoResponse } from '@/lib/perso/types'
import { recordPersoMediaOwner } from '@/lib/perso/ownership'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

function externalRequestBody(spaceSeq: number, url: string, lang?: string) {
  const normalizedLang = lang?.trim()
  return {
    space_seq: spaceSeq,
    url,
    ...(normalizedLang && normalizedLang !== 'auto' ? { lang: normalizedLang } : {}),
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  return handle(async () => {
    const { spaceSeq, url, lang } = await parseBody(req, externalUploadBodySchema)
    const media = await persoFetch<UploadVideoResponse>(
      '/file/api/upload/video/external',
      {
        method: 'PUT',
        baseURL: 'file',
        body: externalRequestBody(spaceSeq, url, lang),
        timeoutMs: 300_000,
      },
    )
    await recordPersoMediaOwner({ userId: auth.session.uid, spaceSeq, media, sourceType: 'external', fileUrl: url })
    return media
  })
}
