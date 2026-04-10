import { persoFetch } from '@/lib/perso/client'
import { handle, requireIntParam } from '@/lib/perso/route-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * PUT /api/perso/queue?spaceSeq={n}
 *   → PUT /video-translator/api/v1/projects/spaces/{spaceSeq}/queue
 *
 * Idempotent: re-calling on an already-initialized queue is safe.
 */
export async function PUT(req: Request) {
  return handle(async () => {
    const url = new URL(req.url)
    const spaceSeq = requireIntParam(url, 'spaceSeq')
    return persoFetch<unknown>(
      `/video-translator/api/v1/projects/spaces/${spaceSeq}/queue`,
      { method: 'PUT', baseURL: 'api' },
    )
  })
}
