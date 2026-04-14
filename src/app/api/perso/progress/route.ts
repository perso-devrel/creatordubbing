import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { persoFetch } from '@/lib/perso/client'
import { ok, fail, requireIntParam } from '@/lib/perso/route-helpers'
import type { ProgressResponse } from '@/lib/perso/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
}

export async function GET(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  try {
    const url = new URL(req.url)
    const projectSeq = requireIntParam(url, 'projectSeq')
    const spaceSeq = requireIntParam(url, 'spaceSeq')

    const data = await persoFetch<ProgressResponse>(
      `/video-translator/api/v1/projects/${projectSeq}/space/${spaceSeq}/progress`,
      { baseURL: 'api' },
    )

    return ok(data, { headers: NO_CACHE_HEADERS })
  } catch (err) {
    return fail(err)
  }
}
