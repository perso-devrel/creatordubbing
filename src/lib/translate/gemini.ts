import 'server-only'

import { GoogleAuth } from 'google-auth-library'
import { getServerEnv } from '@/lib/env'
import type { SrtCue } from '@/utils/srt'

// 모델 ID는 AI Studio / Vertex 양쪽에서 동일하게 'gemini-2.5-flash' 사용.
const MODEL_ID = 'gemini-2.5-flash'
const GEMINI_TIMEOUT_MS = 120_000
const GEMINI_RETRY_DELAYS_MS = [750, 2_000]

// =============================================================================
// [A] AI Studio (generativelanguage API) 경로 — 4주 Vertex 무료 크레딧 소진 후 재활성화 예정
// -----------------------------------------------------------------------------
// 단순 API 키(AIza...) 한 개로 호출. 무료 티어 존재. 코드 변경 없이 바로 동작.
// 재활성화 시: 아래 주석 해제하고 [B] Vertex 블록 주석 처리.
// =============================================================================
//
// const GEMINI_ENDPOINT =
//   `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent`
//
// async function callGemini(prompt: string): Promise<string> {
//   const env = getServerEnv()
//   if (!env.GEMINI_API_KEY) {
//     throw new TranslateError(
//       'GEMINI_NOT_CONFIGURED',
//       'GEMINI_API_KEY is not set on the server',
//     )
//   }
//   const res = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(env.GEMINI_API_KEY)}`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({
//       contents: [{ role: 'user', parts: [{ text: prompt }] }],
//       generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
//     }),
//   })
//   if (!res.ok) {
//     const body = await res.text().catch(() => '')
//     throw new TranslateError('GEMINI_REQUEST_FAILED', `Gemini ${res.status}: ${body.slice(0, 500)}`)
//   }
//   const data = (await res.json()) as {
//     candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
//   }
//   const text = data.candidates?.[0]?.content?.parts?.[0]?.text
//   if (!text) throw new TranslateError('GEMINI_EMPTY_RESPONSE', 'Gemini returned no text')
//   return text
// }

// =============================================================================
// [B] Vertex AI 경로 — 현재 사용 중 (서비스 계정 JSON 자격증명 기반)
// -----------------------------------------------------------------------------
// 환경변수 요구사항:
//   - GOOGLE_VERTEX_PROJECT_ID: GCP 프로젝트 ID
//   - GOOGLE_VERTEX_LOCATION:   'us-central1' | 'asia-northeast1' 등
//   - GOOGLE_VERTEX_CREDENTIALS_JSON: 서비스 계정 JSON 전체 내용 (한 줄 문자열)
//     (Vercel 같은 서버리스 환경에서 파일경로가 안 통하므로 inline JSON 사용)
//   - 또는 GOOGLE_APPLICATION_CREDENTIALS 환경변수에 파일 경로 (로컬 개발용 fallback)
// =============================================================================

let cachedAuth: GoogleAuth | null = null

function getVertexAuth(): GoogleAuth {
  if (cachedAuth) return cachedAuth
  const env = getServerEnv()
  const credentialsJson = env.GOOGLE_VERTEX_CREDENTIALS_JSON

  let credentials: Record<string, unknown> | undefined
  if (credentialsJson) {
    try {
      credentials = JSON.parse(credentialsJson)
    } catch {
      throw new TranslateError(
        'VERTEX_INVALID_CREDENTIALS',
        'GOOGLE_VERTEX_CREDENTIALS_JSON is not valid JSON',
      )
    }
  }

  cachedAuth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    ...(credentials ? { credentials } : {}),
  })
  return cachedAuth
}

function getVertexEndpoint(): string {
  const env = getServerEnv()
  const project = env.GOOGLE_VERTEX_PROJECT_ID
  const location = env.GOOGLE_VERTEX_LOCATION
  if (!project || !location) {
    throw new TranslateError(
      'VERTEX_NOT_CONFIGURED',
      'GOOGLE_VERTEX_PROJECT_ID and GOOGLE_VERTEX_LOCATION are required',
    )
  }
  return `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${MODEL_ID}:generateContent`
}

async function callGemini(prompt: string): Promise<string> {
  let lastError: unknown
  for (let attempt = 0; attempt <= GEMINI_RETRY_DELAYS_MS.length; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS)
    try {
      const auth = getVertexAuth()
      const client = await auth.getClient()
      const tokenInfo = await client.getAccessToken()
      if (!tokenInfo.token) {
        throw new TranslateError('VERTEX_NO_TOKEN', 'Failed to obtain Vertex access token')
      }

      const res = await fetch(getVertexEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenInfo.token}`,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        const error = new TranslateError(
          'VERTEX_REQUEST_FAILED',
          `Vertex ${res.status}: ${body.slice(0, 500)}`,
        )
        if (attempt < GEMINI_RETRY_DELAYS_MS.length && isRetryableGeminiStatus(res.status)) {
          lastError = error
          await sleep(GEMINI_RETRY_DELAYS_MS[attempt])
          continue
        }
        throw error
      }

      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
      }
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) {
        throw new TranslateError('VERTEX_EMPTY_RESPONSE', 'Vertex returned no text')
      }
      return text
    } catch (err) {
      lastError = err
      if (attempt >= GEMINI_RETRY_DELAYS_MS.length || !isRetryableGeminiError(err)) {
        break
      }
      await sleep(GEMINI_RETRY_DELAYS_MS[attempt])
    } finally {
      clearTimeout(timeout)
    }
  }

  if (lastError instanceof Error && lastError.name === 'AbortError') {
    throw new TranslateError('VERTEX_TIMEOUT', `Vertex timed out after ${GEMINI_TIMEOUT_MS}ms`)
  }
  if (lastError instanceof Error) throw lastError
  throw new TranslateError('VERTEX_REQUEST_FAILED', 'Vertex request failed')
}

function isRetryableGeminiStatus(status: number) {
  return status === 408 || status === 409 || status === 429 || status >= 500
}

function isRetryableGeminiError(err: unknown) {
  if (err instanceof TranslateError) {
    return err.code === 'VERTEX_REQUEST_FAILED' || err.code === 'VERTEX_EMPTY_RESPONSE'
  }
  return err instanceof Error && err.name === 'AbortError'
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// =============================================================================
// 공용 — 위 [A]/[B] 중 활성화된 callGemini를 사용
// =============================================================================

export interface MetadataTranslation {
  title: string
  description: string
}

export interface TranslateMetadataInput {
  /** 사용자가 작성한 원본 제목. */
  title: string
  /** 사용자가 작성한 원본 설명. */
  description: string
  /** 위 텍스트의 작성 언어 (ISO 639-1, 예: 'ko'). 'auto'가 들어오면 모델이 추론. */
  sourceLang: string
  /** 번역해야 하는 대상 언어 코드 배열. sourceLang과 동일한 코드는 그대로 통과. */
  targetLangs: string[]
}

export class TranslateError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message)
    this.name = 'TranslateError'
  }
}

/**
 * 한 번의 호출로 여러 대상 언어의 제목/설명을 번역해 받는다.
 * 결과는 { [langCode]: { title, description } } 형태의 plain object.
 *
 * 동일 코드(sourceLang)는 번역 없이 원문 그대로 채움 — round-trip 절약.
 */
export async function translateMetadata(
  input: TranslateMetadataInput,
): Promise<Record<string, MetadataTranslation>> {
  const { title, description, sourceLang, targetLangs } = input

  const result: Record<string, MetadataTranslation> = {}
  const langsToTranslate = targetLangs.filter((l) => l !== sourceLang)

  for (const code of targetLangs) {
    if (code === sourceLang) {
      result[code] = { title, description }
    }
  }

  if (langsToTranslate.length === 0) return result

  const prompt = buildPrompt({
    title,
    description,
    sourceLang,
    targetLangs: langsToTranslate,
  })

  const text = await callGemini(prompt)

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new TranslateError('GEMINI_INVALID_JSON', `Could not parse: ${text.slice(0, 300)}`)
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new TranslateError('GEMINI_INVALID_SHAPE', 'Response is not an object')
  }

  for (const code of langsToTranslate) {
    const entry = (parsed as Record<string, unknown>)[code]
    if (!entry || typeof entry !== 'object') {
      // 누락된 언어는 원문 fallback. 이렇게 하면 부분 실패 시에도 업로드는 진행 가능.
      result[code] = { title, description }
      continue
    }
    const e = entry as { title?: unknown; description?: unknown }
    result[code] = {
      title: typeof e.title === 'string' && e.title.trim().length > 0 ? e.title : title,
      description: typeof e.description === 'string' ? e.description : description,
    }
  }

  return result
}

function buildPrompt(args: {
  title: string
  description: string
  sourceLang: string
  targetLangs: string[]
}): string {
  const sourceHint =
    args.sourceLang === 'auto'
      ? 'Detect the source language automatically.'
      : `The source language is "${args.sourceLang}".`

  return [
    'You are a YouTube metadata translator for a multilingual creator tool.',
    'Translate the given title and description into each target language.',
    'Preserve emojis, hashtags, URLs, @mentions, and line breaks. Keep the tone friendly and SEO-aware.',
    'Do not add explanations or quotes around the output. Output strict JSON only.',
    sourceHint,
    `Target language codes (ISO 639-1 / BCP47-like): ${JSON.stringify(args.targetLangs)}.`,
    'Respond with a JSON object where each key is a target code and the value is an object with "title" and "description".',
    'Example shape: {"ja":{"title":"...","description":"..."},"es":{"title":"...","description":"..."}}',
    '',
    `INPUT_TITLE: ${args.title}`,
    'INPUT_DESCRIPTION:',
    args.description,
  ].join('\n')
}

export interface TimedTranscriptSegment {
  id: number
  startMs: number
  endMs: number
  text: string
  speakerLabel?: string
}

export interface TranslateTimedSubtitlesInput {
  sourceLanguageCode: string
  targetLanguageCode: string
  segments: TimedTranscriptSegment[]
}

const SUBTITLE_CHUNK_SEGMENT_LIMIT = 180
const SUBTITLE_CHUNK_DURATION_MS = 5 * 60 * 1000
const SUBTITLE_CONTEXT_SEGMENT_COUNT = 12

interface TimedSubtitleChunk {
  index: number
  total: number
  segments: TimedTranscriptSegment[]
  contextBefore: string
  contextAfter: string
}

export async function translateTimedSubtitles(input: TranslateTimedSubtitlesInput): Promise<SrtCue[]> {
  const chunks = chunkTimedSegments(input.segments)
  const cues: SrtCue[] = []

  for (const chunk of chunks) {
    const translated = await translateTimedSubtitleChunk({
      ...input,
      segments: chunk.segments,
      chunk,
    })
    cues.push(...translated)
  }

  return normalizeSubtitleTimeline(cues
    .filter((cue) => cue.text.trim().length > 0 && cue.endMs > cue.startMs)
    .sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs))
}

function chunkTimedSegments(segments: TimedTranscriptSegment[]): TimedSubtitleChunk[] {
  const rawChunks: TimedTranscriptSegment[][] = []
  let current: TimedTranscriptSegment[] = []
  let chunkStart = 0

  for (const segment of segments) {
    if (current.length === 0) {
      chunkStart = segment.startMs
    }

    const wouldExceedCount = current.length >= SUBTITLE_CHUNK_SEGMENT_LIMIT
    const wouldExceedDuration = segment.endMs - chunkStart > SUBTITLE_CHUNK_DURATION_MS
    if (current.length > 0 && (wouldExceedCount || wouldExceedDuration)) {
      rawChunks.push(current)
      current = []
      chunkStart = segment.startMs
    }

    current.push(segment)
  }

  if (current.length > 0) rawChunks.push(current)
  return rawChunks.map((chunk, index) => ({
    index,
    total: rawChunks.length,
    segments: chunk,
    contextBefore: summarizeContext(rawChunks[index - 1]?.slice(-SUBTITLE_CONTEXT_SEGMENT_COUNT) ?? []),
    contextAfter: summarizeContext(rawChunks[index + 1]?.slice(0, SUBTITLE_CONTEXT_SEGMENT_COUNT) ?? []),
  }))
}

function summarizeContext(segments: TimedTranscriptSegment[]) {
  return segments
    .map((segment) => segment.text.trim())
    .filter(Boolean)
    .join(' ')
    .slice(0, 1200)
}

async function translateTimedSubtitleChunk(input: TranslateTimedSubtitlesInput & { chunk: TimedSubtitleChunk }): Promise<SrtCue[]> {
  let parsed: unknown = null
  let rawCues: unknown[] | null = null
  let lastError: unknown
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const text = await callGemini(buildTimedSubtitlePrompt(input, attempt))
      parsed = parseGeminiJson(text)
      rawCues = extractRawCues(parsed)
      if (!rawCues) {
        throw new TranslateError('GEMINI_INVALID_SUBTITLE_SHAPE', 'Timed subtitle response must contain a cues array')
      }
      break
    } catch (err) {
      lastError = err
      if (attempt === 2) throw err
    }
  }
  if (parsed === null) {
    throw lastError instanceof Error ? lastError : new TranslateError('GEMINI_INVALID_JSON', 'Could not parse subtitle JSON')
  }
  if (!rawCues) {
    throw lastError instanceof Error ? lastError : new TranslateError(
      'GEMINI_INVALID_SUBTITLE_SHAPE',
      'Timed subtitle response must contain a cues array',
    )
  }

  const chunkStart = Math.min(...input.segments.map((segment) => segment.startMs))
  const chunkEnd = Math.max(...input.segments.map((segment) => segment.endMs))
  const cues: SrtCue[] = []

  for (const raw of rawCues) {
    if (!raw || typeof raw !== 'object') continue
    const item = raw as Record<string, unknown>
    const startMs = asFiniteNumber(item.startMs)
    const endMs = asFiniteNumber(item.endMs)
    const text = typeof item.text === 'string' ? item.text.trim() : ''
    if (startMs === null || endMs === null || !text) continue
    const safeStart = clamp(Math.floor(startMs), chunkStart, chunkEnd)
    const safeEnd = clamp(Math.floor(endMs), safeStart + 250, chunkEnd)
    if (safeEnd <= safeStart) continue
    cues.push({ startMs: safeStart, endMs: safeEnd, text: normalizeCaptionText(text) })
  }

  if (cues.length === 0 && input.segments.length > 0) {
    throw new TranslateError('GEMINI_EMPTY_SUBTITLES', 'Gemini returned no usable subtitle cues')
  }

  return cues
}

function extractRawCues(parsed: unknown): unknown[] | null {
  if (Array.isArray(parsed)) return parsed
  if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { cues?: unknown }).cues)) {
    return (parsed as { cues: unknown[] }).cues
  }
  return null
}

function parseGeminiJson(text: string): unknown {
  const trimmed = text.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  const jsonText = fenced ? fenced[1] : trimmed
  try {
    return JSON.parse(jsonText)
  } catch {
    throw new TranslateError('GEMINI_INVALID_JSON', `Could not parse: ${text.slice(0, 300)}`)
  }
}

function asFiniteNumber(value: unknown): number | null {
  const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(number) ? number : null
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function normalizeCaptionText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join('\n')
}

function normalizeSubtitleTimeline(cues: SrtCue[]): SrtCue[] {
  const normalized: SrtCue[] = []
  const minDurationMs = 250
  const minGapMs = 80

  for (const cue of cues) {
    const previous = normalized[normalized.length - 1]
    let startMs = cue.startMs
    const endMs = cue.endMs

    if (previous && startMs < previous.endMs + minGapMs) {
      const shiftedStart = previous.endMs + minGapMs
      if (endMs - shiftedStart >= minDurationMs) {
        startMs = shiftedStart
      } else if (startMs - previous.startMs >= minDurationMs + minGapMs) {
        previous.endMs = Math.max(previous.startMs + minDurationMs, startMs - minGapMs)
      } else {
        startMs = previous.endMs
      }
    }

    if (endMs - startMs < minDurationMs) continue
    normalized.push({ ...cue, startMs, endMs })
  }

  return normalized
}

function buildTimedSubtitlePrompt(input: TranslateTimedSubtitlesInput & { chunk: TimedSubtitleChunk }, attempt = 0): string {
  const sourceHint =
    input.sourceLanguageCode === 'auto'
      ? 'Detect the source language from the text.'
      : `The source language is "${input.sourceLanguageCode}".`
  const retryInstruction = attempt > 0
    ? 'Previous output was invalid. Return valid JSON only, with no markdown and no missing "cues" key.'
    : ''

  return [
    'You are a senior subtitle localizer for YouTube videos.',
    sourceHint,
    `Create publication-ready subtitles for target language "${input.targetLanguageCode}".`,
    'Use natural, native phrasing. Preserve meaning, tone, names, numbers, product terms, and speaker intent.',
    'Return subtitles, not a literal word-by-word transcript. Split or merge nearby lines only when it improves readability.',
    'Keep every cue inside the timing range of the provided source segments. Do not invent timestamps outside the input.',
    'Respect speech timing: each cue must appear while that speech is happening. Avoid text that is too long for the visible duration.',
    'Use one or two short lines per cue. Prefer concise phrasing suitable for YouTube captions.',
    `This is chunk ${input.chunk.index + 1} of ${input.chunk.total} from one merged transcript. Keep terminology consistent with the surrounding context.`,
    'Use CONTEXT_BEFORE and CONTEXT_AFTER only for continuity. Do not output captions for context text.',
    'Output strict JSON only with this shape: {"cues":[{"startMs":0,"endMs":1200,"text":"..."}]}',
    'Do not include markdown, comments, SRT numbering, or explanations.',
    retryInstruction,
    '',
    'CONTEXT_BEFORE:',
    input.chunk.contextBefore || '(none)',
    '',
    'CONTEXT_AFTER:',
    input.chunk.contextAfter || '(none)',
    '',
    'SOURCE_SEGMENTS:',
    JSON.stringify(input.segments),
  ].filter((line) => line !== '').join('\n')
}
