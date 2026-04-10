import 'server-only'

import { NextResponse } from 'next/server'
import { YouTubeError } from '@/lib/youtube/server'

export function ytOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true as const, data }, init)
}

export function ytFail(err: unknown) {
  if (err instanceof YouTubeError) {
    return NextResponse.json(
      { ok: false as const, error: { code: err.code, message: err.message } },
      { status: err.status || 500 },
    )
  }
  const message = err instanceof Error ? err.message : 'Unknown YouTube error'
  return NextResponse.json(
    { ok: false as const, error: { code: 'UNKNOWN', message } },
    { status: 500 },
  )
}

export async function ytHandle<T>(fn: () => Promise<T>): Promise<Response> {
  try {
    return ytOk(await fn())
  } catch (err) {
    return ytFail(err)
  }
}

/**
 * Extract access token from either the Authorization header or a custom
 * `x-google-access-token` header. Throws YouTubeError(401) if missing.
 */
export function requireAccessToken(req: Request): string {
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
