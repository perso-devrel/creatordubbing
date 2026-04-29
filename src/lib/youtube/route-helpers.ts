import 'server-only'

import { apiOk, apiFail, apiFailFromError } from '@/lib/api/response'
import { YouTubeError } from '@/lib/youtube/server'
import { logger } from '@/lib/logger'

export { apiOk as ytOk }

export function ytFail(err: unknown) {
  if (err instanceof YouTubeError) {
    const status = err.status || 500
    if (status >= 500) {
      logger.error('youtube api error', { status, code: err.code, message: err.message })
    }
    return apiFail(err.code, err.message, status)
  }
  return apiFailFromError(err)
}

export async function ytHandle<T>(fn: () => Promise<T>): Promise<Response> {
  try {
    return apiOk(await fn())
  } catch (err) {
    return ytFail(err)
  }
}

/**
 * YouTube API 호출 함수를 401 자동 재시도로 감싼다.
 * 401(인증 거부)이 떨어지면 DB의 refresh_token으로 강제 리프레시 후 1회 재시도한다.
 * 사용 예:
 *   await withTokenRetry(req, (token) => uploadCaptionToYouTube({ accessToken: token, ... }))
 */
export async function withTokenRetry<T>(
  req: Request,
  fn: (accessToken: string) => Promise<T>,
): Promise<T> {
  const token = await requireAccessToken(req)
  try {
    return await fn(token)
  } catch (err) {
    const status = err instanceof YouTubeError ? err.status : 0
    if (status !== 401) throw err
    // 401: 토큰이 stale일 가능성 → 강제 리프레시 후 1회 재시도
    const fresh = await requireAccessToken(req, { forceRefresh: true })
    if (fresh === token) throw err
    return await fn(fresh)
  }
}

import type { ZodSchema, ZodError } from 'zod'

export function parseQuery<T>(url: URL, schema: ZodSchema<T>): T {
  const raw = Object.fromEntries(url.searchParams.entries())
  const result = schema.safeParse(raw)
  if (!result.success) {
    const zodErr = result.error as ZodError
    const details = zodErr.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new YouTubeError(400, `Invalid query: ${details}`, 'INVALID_QUERY')
  }
  return result.data
}

export async function parseYtBody<T>(req: Request, schema: ZodSchema<T>): Promise<T> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    throw new YouTubeError(400, 'Invalid JSON body', 'INVALID_BODY')
  }
  const result = schema.safeParse(raw)
  if (!result.success) {
    const zodErr = result.error as ZodError
    const details = zodErr.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new YouTubeError(400, `Invalid body: ${details}`, 'INVALID_BODY')
  }
  return result.data
}

import { cookies } from 'next/headers'
import { verifySessionCookie } from '@/lib/auth/session-cookie'
import { getOrRefreshAccessToken } from '@/lib/auth/token-refresh'

/**
 * Google 액세스 토큰을 가져온다. DB+세션 기반 리프레시 경로를 최우선으로 삼아
 * stale 쿠키를 자동으로 우회한다(getOrRefreshAccessToken이 만료 임박 시 자동 갱신).
 * - 1순위: dubtube_session 쿠키 → uid 검증 → DB의 refresh_token으로 fresh 토큰 확보
 * - 2순위: google_access_token 쿠키 (세션이 없는 짧은 흐름용 fallback)
 * - 3순위: Authorization Bearer / x-google-access-token 헤더
 */
export async function requireAccessToken(
  req: Request,
  opts: { forceRefresh?: boolean } = {},
): Promise<string> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('dubtube_session')?.value

  if (sessionCookie) {
    const uid = await verifySessionCookie(sessionCookie)
    if (uid) {
      const token = await getOrRefreshAccessToken(uid, { force: opts.forceRefresh })
      if (token) return token
    }
  }

  const cookieToken = cookieStore.get('google_access_token')?.value
  if (cookieToken) return cookieToken

  const auth = req.headers.get('authorization') || ''
  if (auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim()
  }
  const custom = req.headers.get('x-google-access-token')
  if (custom) return custom
  throw new YouTubeError(
    401,
    'Missing Google access token',
    'MISSING_ACCESS_TOKEN',
  )
}
