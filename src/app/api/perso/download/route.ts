import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { persoFetch } from '@/lib/perso/client'
import { handle, requireIntParam } from '@/lib/perso/route-helpers'
import { downloadTargetSchema } from '@/lib/validators/perso'
import type { DownloadResponse } from '@/lib/perso/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  return handle(async () => {
    const url = new URL(req.url)
    const projectSeq = requireIntParam(url, 'projectSeq')
    const spaceSeq = requireIntParam(url, 'spaceSeq')
    const rawTarget = url.searchParams.get('target') || 'all'
    const parsed = downloadTargetSchema.safeParse(rawTarget)
    if (!parsed.success) {
      throw Object.assign(new Error(`Invalid target: ${rawTarget}`), {
        name: 'PersoError',
        code: 'INVALID_PARAM',
        status: 400,
      })
    }
    const target = parsed.data

    return persoFetch<DownloadResponse>(
      `/video-translator/api/v1/projects/${projectSeq}/spaces/${spaceSeq}/download`,
      { baseURL: 'api', query: { target } },
    )
  })
}
