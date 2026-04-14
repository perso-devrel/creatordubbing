import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { persoFetch } from '@/lib/perso/client'
import { PersoError } from '@/lib/perso/errors'
import { handle, parseBody, requireIntParam } from '@/lib/perso/route-helpers'
import { translateBodySchema } from '@/lib/validators/perso'
import type { TranslateResponse } from '@/lib/perso/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  return handle(async () => {
    const url = new URL(req.url)
    const spaceSeq = requireIntParam(url, 'spaceSeq')
    const body = await parseBody(req, translateBodySchema)

    try {
      await persoFetch<unknown>(
        `/video-translator/api/v1/projects/spaces/${spaceSeq}/queue`,
        { method: 'PUT', baseURL: 'api' },
      )
    } catch (err) {
      if (err instanceof PersoError && err.status >= 500) {
        throw err
      }
    }

    return persoFetch<TranslateResponse>(
      `/video-translator/api/v1/projects/spaces/${spaceSeq}/translate`,
      {
        method: 'POST',
        baseURL: 'api',
        body,
      },
    )
  })
}
