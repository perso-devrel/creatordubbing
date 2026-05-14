import 'server-only'

import { apiOk, apiFail, apiFailFromError } from '@/lib/api/response'
import { YouTubeError } from '@/lib/youtube/server'
import { logger } from '@/lib/logger'

export { apiOk as ytOk }

export function ytFail(err: unknown) {
  if (err instanceof YouTubeError) {
    const status = err.status || 500
    const logPayload = { status, code: err.code, reason: err.reason, message: err.message }
    if (status >= 500) logger.error('youtube api error', logPayload)
    else logger.warn('youtube api error', logPayload)
    return apiFail(err.code, toUserMessage(err.code, status), status)
  }
  return apiFailFromError(err)
}

function toUserMessage(code: string, status: number) {
  if (code === 'MISSING_ACCESS_TOKEN') {
    return 'YouTube 연결이 필요합니다. 설정에서 Google 계정으로 YouTube 연결을 눌러 권한을 허용해 주세요.'
  }
  if (code === 'YOUTUBE_RECONNECT_REQUIRED') {
    return 'YouTube 권한이 빠져 있습니다. 설정에서 Google 계정으로 YouTube 연결을 다시 진행하고, 권한 동의 화면에서 YouTube 권한을 허용해 주세요.'
  }
  if (code === 'YOUTUBE_CHANNEL_REQUIRED') {
    return '현재 Google 계정에 YouTube 채널이 없습니다. YouTube에서 채널을 만든 뒤 다시 연결해 주세요.'
  }
  if (code === 'YOUTUBE_CHANNEL_FORBIDDEN') {
    return '이 Google 계정으로는 해당 YouTube 채널을 사용할 수 없습니다. 채널 소유자 또는 관리자 계정으로 다시 연결해 주세요.'
  }
  if (code === 'YOUTUBE_CHANNEL_UNAVAILABLE') {
    return 'YouTube 채널이 닫혔거나 정지되어 정보를 불러올 수 없습니다. YouTube Studio에서 채널 상태를 확인해 주세요.'
  }
  if (code === 'VIDEO_NOT_FOUND') {
    return 'YouTube 영상을 찾을 수 없습니다.'
  }
  if (code === 'QUOTA_EXCEEDED') {
    return 'YouTube API 사용량 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.'
  }
  if (code === 'INVALID_QUERY' || code === 'INVALID_BODY') {
    return '입력값을 확인해 주세요.'
  }
  if (code.includes('METADATA')) {
    return 'YouTube 제목과 설명을 처리하지 못했습니다.'
  }
  if (code.includes('CAPTION')) {
    return 'YouTube 자막을 처리하지 못했습니다.'
  }
  if (code.includes('UPLOAD')) {
    return 'YouTube 업로드를 처리하지 못했습니다.'
  }
  if (code.includes('ANALYTICS')) {
    return 'YouTube 분석 데이터를 불러오지 못했습니다.'
  }
  if (status === 401) {
    return 'YouTube 연결이 만료되었습니다. 다시 연결해 주세요.'
  }
  if (status === 403) {
    return 'YouTube 요청 권한을 확인하지 못했습니다. 설정에서 YouTube 연결을 다시 진행한 뒤 계속 실패하면 다른 Google 계정 또는 채널 권한을 확인해 주세요.'
  }
  return 'YouTube 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

export async function ytHandle<T>(fn: () => Promise<T>): Promise<Response> {
  try {
    return apiOk(await fn())
  } catch (err) {
    return ytFail(err)
  }
}

/**
 * YouTube API 호출 함수를 인증/권한 오류 자동 재시도로 감싼다.
 * 401 또는 YouTube 권한 누락 403이 떨어지면 DB의 refresh_token으로 강제 리프레시 후 1회 재시도한다.
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
    const shouldRefresh = err instanceof YouTubeError && (
      err.status === 401 ||
      err.code === 'YOUTUBE_RECONNECT_REQUIRED'
    )
    if (!shouldRefresh) throw err
    // 401 또는 권한 누락 403은 DB의 refresh_token으로 새 access token을 받아 1회만 재시도한다.
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
 * Google 액세스 토큰을 가져온다. 앱 세션 쿠키로 사용자 uid를 검증한 뒤,
 * 서버 DB에 암호화 저장된 Google 토큰만 사용한다.
 */
export async function requireAccessToken(
  _req: Request,
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

  throw new YouTubeError(
    401,
    'Missing Google access token',
    'MISSING_ACCESS_TOKEN',
  )
}
