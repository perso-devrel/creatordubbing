import { persoFetch } from '@/lib/perso/client'
import { handle, requireIntParam } from '@/lib/perso/route-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/perso/lipsync?projectSeq={p}&spaceSeq={s}
 *   → POST /video-translator/api/v1/projects/{projectSeq}/spaces/{spaceSeq}/lip-sync
 *
 * Post-processing step that aligns dubbed audio to the original speaker's
 * mouth movements. Only available on plans that support lip sync.
 */
export async function POST(req: Request) {
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
