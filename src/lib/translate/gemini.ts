import 'server-only'

import { GoogleAuth } from 'google-auth-library'
import { getServerEnv } from '@/lib/env'

// 모델 ID는 AI Studio / Vertex 양쪽에서 동일하게 'gemini-2.5-flash' 사용.
const MODEL_ID = 'gemini-2.5-flash'

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
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new TranslateError(
      'VERTEX_REQUEST_FAILED',
      `Vertex ${res.status}: ${body.slice(0, 500)}`,
    )
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw new TranslateError('VERTEX_EMPTY_RESPONSE', 'Vertex returned no text')
  }
  return text
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
