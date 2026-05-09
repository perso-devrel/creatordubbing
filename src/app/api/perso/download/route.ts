import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { persoFetch } from '@/lib/perso/client'
import { handle, requireIntParam } from '@/lib/perso/route-helpers'
import { PersoError } from '@/lib/perso/errors'
import { downloadTargetSchema } from '@/lib/validators/perso'
import type { DownloadResponse } from '@/lib/perso/types'
import { assertPersoProjectOwner } from '@/lib/perso/ownership'

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
      throw new PersoError('INVALID_PARAM', '입력값 형식을 확인해 주세요.', 400)
    }
    const target = parsed.data
    await assertPersoProjectOwner(auth.session.uid, projectSeq)

    return persoFetch<DownloadResponse>(
      `/video-translator/api/v1/projects/${projectSeq}/spaces/${spaceSeq}/download`,
      { baseURL: 'api', query: { target } },
    )
  })
}
