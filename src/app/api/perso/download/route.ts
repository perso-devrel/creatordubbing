import { persoFetch } from '@/lib/perso/client'
import { handle, requireIntParam } from '@/lib/perso/route-helpers'
import type { DownloadResponse, DownloadTarget } from '@/lib/perso/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/perso/download?projectSeq={p}&spaceSeq={s}&target={t}
 *   → GET /video-translator/api/v1/projects/{projectSeq}/spaces/{spaceSeq}/download?target={t}
 *
 * Valid targets: video | dubbingVideo | lipSyncVideo | originalSubtitle
 *               | translatedSubtitle | voiceAudio | backgroundAudio | all
 */
export async function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url)
    const projectSeq = requireIntParam(url, 'projectSeq')
    const spaceSeq = requireIntParam(url, 'spaceSeq')
    const target = (url.searchParams.get('target') || 'all') as DownloadTarget

    return persoFetch<DownloadResponse>(
      `/video-translator/api/v1/projects/${projectSeq}/spaces/${spaceSeq}/download`,
      { baseURL: 'api', query: { target } },
    )
  })
}
