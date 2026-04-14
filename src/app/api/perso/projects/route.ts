import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { persoFetch } from '@/lib/perso/client'
import { handle, requireIntParam } from '@/lib/perso/route-helpers'
import type { ProjectDetail } from '@/lib/perso/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  return handle(async () => {
    const url = new URL(req.url)
    const spaceSeq = requireIntParam(url, 'spaceSeq')
    return persoFetch<ProjectDetail[]>(
      `/video-translator/api/v1/projects/spaces/${spaceSeq}`,
      { baseURL: 'api' },
    )
  })
}
