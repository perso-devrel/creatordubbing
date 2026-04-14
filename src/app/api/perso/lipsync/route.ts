import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { persoFetch } from '@/lib/perso/client'
import { handle, requireIntParam } from '@/lib/perso/route-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  return handle(async () => {
    const url = new URL(req.url)
    const projectSeq = requireIntParam(url, 'projectSeq')
    const spaceSeq = requireIntParam(url, 'spaceSeq')
    return persoFetch<unknown>(
      `/video-translator/api/v1/projects/${projectSeq}/spaces/${spaceSeq}/lip-sync`,
      { method: 'POST', baseURL: 'api' },
    )
  })
}
