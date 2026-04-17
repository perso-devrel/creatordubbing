import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { persoFetch } from '@/lib/perso/client'
import { handle, parseBody } from '@/lib/perso/route-helpers'
import { externalUploadBodySchema } from '@/lib/validators/perso'
import type { UploadVideoResponse } from '@/lib/perso/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function PUT(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  return handle(async () => {
    const { spaceSeq, url, lang = 'ko' } = await parseBody(req, externalUploadBodySchema)
    return persoFetch<UploadVideoResponse>(
      '/file/api/upload/video/external',
      {
        method: 'PUT',
        baseURL: 'file',
        body: { space_seq: spaceSeq, url, lang },
        timeoutMs: 300_000,
      },
    )
  })
}
