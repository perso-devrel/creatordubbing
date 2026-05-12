import 'server-only'

import { persoFetch } from '@/lib/perso/client'
import type { SttScriptResponse, SttScriptSentence } from '@/lib/perso/types'
import type { TimedTranscriptSegment } from '@/lib/translate/gemini'

export async function fetchAllSttScript(projectSeq: number, spaceSeq: number): Promise<SttScriptSentence[]> {
  const sentences: SttScriptSentence[] = []
  let cursorId: number | null | undefined

  for (let page = 0; page < 100; page += 1) {
    const data = await persoFetch<SttScriptResponse>(
      `/video-translator/api/v1/projects/${projectSeq}/spaces/${spaceSeq}/stt/script`,
      {
        baseURL: 'api',
        query: {
          size: 10000,
          cursorId,
        },
      },
    )

    if (Array.isArray(data.sentences)) {
      sentences.push(...data.sentences)
    }

    if (!data.hasNext || data.nextCursorId == null) break
    cursorId = data.nextCursorId
  }

  return sentences
}

export function mapSttSegments(sentences: SttScriptSentence[]): TimedTranscriptSegment[] {
  return sentences
    .map((sentence, index) => {
      const startMs = Number(sentence.offsetMs ?? 0)
      const durationMs = Number(sentence.durationMs ?? 0)
      const endMs = startMs + durationMs
      return {
        id: Number(sentence.seq ?? index + 1),
        startMs,
        endMs,
        text: String(sentence.originalText || sentence.originalDraftText || '').trim(),
        speakerLabel: sentence.speakerOrderIndex ? `Speaker ${sentence.speakerOrderIndex}` : undefined,
      }
    })
    .filter((segment) => segment.text.length > 0 && segment.endMs > segment.startMs)
}
