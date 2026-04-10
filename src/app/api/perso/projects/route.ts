import { persoFetch } from '@/lib/perso/client'
import { handle, requireIntParam } from '@/lib/perso/route-helpers'
import type { ProjectDetail } from '@/lib/perso/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/perso/projects?spaceSeq={n}
 *   → GET /video-translator/api/v1/projects/spaces/{spaceSeq}
 */
export async function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url)
    const spaceSeq = requireIntParam(url, 'spaceSeq')
    return persoFetch<ProjectDetail[]>(
      `/video-translator/api/v1/projects/spaces/${spaceSeq}`,
      { baseURL: 'api' },
    )
  })
}
