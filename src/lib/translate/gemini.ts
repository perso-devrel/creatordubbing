import 'server-only'

import { getServerEnv } from '@/lib/env'

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

export interface MetadataTranslation {
  title: string
  description: string
}

export interface TranslateMetadataInput {
  /** 사용자가 작성한 원본 제목. */
  title: string
  /** 사용자가 작성한 원본 설명. */
  description: string
  /** 위 텍스트의 작성 언어 (ISO 639-1, 예: 'ko'). 'auto'가 들어오면 Gemini가 추론. */
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
 * 한 번의 Gemini 호출로 여러 대상 언어의 제목/설명을 번역해 받는다.
 * 결과는 { [langCode]: { title, description } } 형태의 plain object.
 *
 * 동일 코드(sourceLang)는 번역 없이 원문 그대로 채움 — Gemini round-trip 절약.
 */
export async function translateMetadata(
  input: TranslateMetadataInput,
): Promise<Record<string, MetadataTranslation>> {
  const { title, description, sourceLang, targetLangs } = input

  const result: Record<string, MetadataTranslation> = {}
  const langsToTranslate = targetLangs.filter((l) => l !== sourceLang)

  // sourceLang과 동일한 언어는 번역 없이 통과.
  for (const code of targetLangs) {
    if (code === sourceLang) {
      result[code] = { title, description }
    }
  }

  if (langsToTranslate.length === 0) return result

  const env = getServerEnv()
  if (!env.GEMINI_API_KEY) {
    throw new TranslateError(
      'GEMINI_NOT_CONFIGURED',
      'GEMINI_API_KEY is not set on the server',
    )
  }

  const prompt = buildPrompt({
    title,
    description,
    sourceLang,
    targetLangs: langsToTranslate,
  })

  const res = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(env.GEMINI_API_KEY)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new TranslateError(
      'GEMINI_REQUEST_FAILED',
      `Gemini ${res.status}: ${body.slice(0, 500)}`,
    )
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw new TranslateError('GEMINI_EMPTY_RESPONSE', 'Gemini returned no text')
  }

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
