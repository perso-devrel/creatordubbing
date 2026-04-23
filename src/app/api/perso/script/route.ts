import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { persoFetch } from '@/lib/perso/client'
import { handle, parseBody, requireIntParam } from '@/lib/perso/route-helpers'
import { scriptPatchBodySchema } from '@/lib/validators/perso'
import type { ScriptSentence } from '@/lib/perso/types'

interface RawSentence {
  seq: number
  offsetMs: number
  durationMs: number
  originalText: string
  translatedText: string
  speakerOrderIndex?: number
}

function mapSentence(s: RawSentence): ScriptSentence {
  return {
    sentenceSeq: s.seq,
    audioSentenceSeq: s.seq,
    startMs: s.offsetMs,
    endMs: s.offsetMs + s.durationMs,
    originalText: s.originalText,
    translatedText: s.translatedText,
    speakerLabel: s.speakerOrderIndex != null ? `화자 ${s.speakerOrderIndex}` : '',
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  return handle(async () => {
    const url = new URL(req.url)
    const projectSeq = requireIntParam(url, 'projectSeq')
    const spaceSeq = requireIntParam(url, 'spaceSeq')
    const raw = await persoFetch<{ sentences?: RawSentence[] } | RawSentence[]>(
      `/video-translator/api/v1/projects/${projectSeq}/spaces/${spaceSeq}/script`,
      { baseURL: 'api' },
    )
    const list: RawSentence[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.sentences)
        ? raw.sentences
        : []
    return list.map(mapSentence)
  })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  return handle(async () => {
    const url = new URL(req.url)
    const projectSeq = requireIntParam(url, 'projectSeq')
    const sentenceSeq = requireIntParam(url, 'sentenceSeq')
    const body = await parseBody(req, scriptPatchBodySchema)
    return persoFetch<unknown>(
      `/video-translator/api/v1/project/${projectSeq}/audio-sentence/${sentenceSeq}`,
      { method: 'PATCH', baseURL: 'api', body },
    )
  })
}
