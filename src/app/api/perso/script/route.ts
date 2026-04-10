import { persoFetch } from '@/lib/perso/client'
import { handle, readJson, requireIntParam } from '@/lib/perso/route-helpers'
import type { ScriptSentence } from '@/lib/perso/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/perso/script?projectSeq={p}&spaceSeq={s}
 *   → GET /video-translator/api/v1/projects/{projectSeq}/spaces/{spaceSeq}/script
 */
export async function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url)
    const projectSeq = requireIntParam(url, 'projectSeq')
    const spaceSeq = requireIntParam(url, 'spaceSeq')
    return persoFetch<ScriptSentence[]>(
      `/video-translator/api/v1/projects/${projectSeq}/spaces/${spaceSeq}/script`,
      { baseURL: 'api' },
    )
  })
}

/**
 * PATCH /api/perso/script?projectSeq={p}&sentenceSeq={s}
 *   → PATCH /video-translator/api/v1/project/{projectSeq}/audio-sentence/{sentenceSeq}
 *
 * Body: { translatedText: string }
 * Used for inline script editing in the review UI.
 */
export async function PATCH(req: Request) {
  return handle(async () => {
    const url = new URL(req.url)
    const projectSeq = requireIntParam(url, 'projectSeq')
    const sentenceSeq = requireIntParam(url, 'sentenceSeq')
    const body = await readJson<{ translatedText: string }>(req)
    return persoFetch<unknown>(
      `/video-translator/api/v1/project/${projectSeq}/audio-sentence/${sentenceSeq}`,
      { method: 'PATCH', baseURL: 'api', body },
    )
  })
}
