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

export async function requireSession(
  req: NextRequest,
): Promise<
  | { ok: true; session: Session }
  | { ok: false; response: Response }
> {
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
        logger.info('session restored with available google token', { uid })
      }

      const user = await getUser(uid)
      if (user?.email) {
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
