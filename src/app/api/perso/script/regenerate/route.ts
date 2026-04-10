import { persoFetch } from '@/lib/perso/client'
import { handle, requireIntParam } from '@/lib/perso/route-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * PATCH /api/perso/script/regenerate?projectSeq={p}&audioSentenceSeq={s}
 *   → PATCH /video-translator/api/v1/project/{projectSeq}/audio-sentence/{seq}/generate-audio
 *
 * Triggers TTS re-synthesis for a single sentence after translation edit.
 */
export async function PATCH(req: Request) {
  return handle(async () => {
    const url = new URL(req.url)
    const projectSeq = requireIntParam(url, 'projectSeq')
    const audioSentenceSeq = requireIntParam(url, 'audioSentenceSeq')
    return persoFetch<unknown>(
      `/video-translator/api/v1/project/${projectSeq}/audio-sentence/${audioSentenceSeq}/generate-audio`,
      { method: 'PATCH', baseURL: 'api' },
    )
  })
}
