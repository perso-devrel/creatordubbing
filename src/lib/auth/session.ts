import 'server-only'

import { NextRequest } from 'next/server'
import { apiFail } from '@/lib/api/response'
import { verifySessionCookiePayload } from '@/lib/auth/session-cookie'
import { getOrRefreshAccessToken } from '@/lib/auth/token-refresh'
import { getUser, isUserSessionActive } from '@/lib/db/queries'
import { logger } from '@/lib/logger'

export interface Session {
  uid: string
  email: string
}

interface GoogleTokenInfo {
  sub: string
  email: string
  email_verified: string
  expires_in: string
}

const GOOGLE_TOKENINFO_URL = 'https://www.googleapis.com/oauth2/v3/tokeninfo'

function getAccessToken(req: NextRequest): string | null {
  return (
    req.cookies.get('google_access_token')?.value ||
    req.headers.get('x-google-access-token') ||
    null
  )
}

async function verifyTokenWithGoogle(
  token: string,
): Promise<{ uid: string; email: string } | null> {
  try {
    const res = await fetch(
      `${GOOGLE_TOKENINFO_URL}?access_token=${encodeURIComponent(token)}`,
    )
    if (!res.ok) return null
    const info = (await res.json()) as GoogleTokenInfo
    if (!info.sub || !info.email) return null
    return { uid: info.sub, email: info.email }
  } catch {
    return null
  }
}

export async function requireSession(
  req: NextRequest,
): Promise<
  | { ok: true; session: Session }
  | { ok: false; response: Response }
> {
  // 1) Try the access token cookie / header (fast path)
  const cookieToken = getAccessToken(req)
  if (cookieToken) {
    const info = await verifyTokenWithGoogle(cookieToken)
    if (info) return { ok: true, session: info }
  }

  // 2) Cookie expired or invalid — try refreshing via session cookie
  const sessionCookie = req.cookies.get('dubtube_session')?.value
  if (sessionCookie) {
    const verified = await verifySessionCookiePayload(sessionCookie)
    if (verified) {
      const uid = verified.uid
      if (!verified.legacy) {
        const active = await isUserSessionActive(verified.sid, uid)
        if (!active) {
          return {
            ok: false,
            response: apiFail('UNAUTHORIZED', 'Session has expired or was revoked', 401),
          }
        }
      }

      const refreshedToken = await getOrRefreshAccessToken(uid)
      if (refreshedToken) {
        const info = await verifyTokenWithGoogle(refreshedToken)
        if (info) {
          logger.info('session restored via token refresh', { uid })
          return { ok: true, session: info }
        }
      }

      // Token refresh failed but session cookie is valid — use DB email as fallback
      const user = await getUser(uid)
      if (user?.email) {
        logger.info('session restored from DB (token refresh failed)', { uid })
        return { ok: true, session: { uid, email: user.email as string } }
      }
    }
  }

  return {
    ok: false,
    response: apiFail('UNAUTHORIZED', 'Missing or expired access token', 401),
  }
}

export function forbiddenUidMismatch(): Response {
  return apiFail('FORBIDDEN', 'UID mismatch: you can only access your own data', 403)
}
