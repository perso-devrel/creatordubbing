import { persoFetch } from '@/lib/perso/client'
import { handle, requireIntParam } from '@/lib/perso/route-helpers'
import type { ProjectDetail } from '@/lib/perso/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/perso/project?projectSeq={p}&spaceSeq={s}
 *   → GET /video-translator/api/v1/projects/{projectSeq}/spaces/{spaceSeq}
 *
 * Single project detail lookup. Complements /api/perso/projects (list).
 */
export async function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url)
    const projectSeq = requireIntParam(url, 'projectSeq')
    const spaceSeq = requireIntParam(url, 'spaceSeq')
    return persoFetch<ProjectDetail>(
      `/video-translator/api/v1/projects/${projectSeq}/spaces/${spaceSeq}`,
      { baseURL: 'api' },
    )
  })
}
