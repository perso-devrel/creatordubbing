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

export async function requireAccessToken(req: Request): Promise<string> {
  const cookieStore = await cookies()
  const cookieToken = cookieStore.get('google_access_token')?.value

  if (!cookieToken) {
    const sessionCookie = cookieStore.get('creatordub_session')?.value
    if (sessionCookie) {
      const uid = await verifySessionCookie(sessionCookie)
      if (uid) {
        const refreshed = await getOrRefreshAccessToken(uid)
        if (refreshed) return refreshed
      }
    }
  }

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
