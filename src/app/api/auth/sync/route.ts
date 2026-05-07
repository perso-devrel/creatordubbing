import { NextRequest } from 'next/server'
import { createUserSession, upsertUser } from '@/lib/db/queries'
import { createSessionCookie, SESSION_COOKIE, SESSION_TTL_SECONDS, verifySessionCookie } from '@/lib/auth/session-cookie'
import { apiOk, apiFail, apiFailFromError } from '@/lib/api/response'
import { syncBodySchema } from '@/lib/validators/auth'
import { getOrRefreshAccessToken } from '@/lib/auth/token-refresh'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Verify a Google access token and return the user info.
 * Returns null if the token is invalid or expired.
 */
async function verifyGoogleToken(accessToken: string): Promise<{ sub: string; email: string } | null> {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return null
    const info = await res.json() as { sub?: string; email?: string }
    if (!info.sub || !info.email) return null
    return { sub: info.sub, email: info.email }
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const parsed = syncBodySchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      return apiFail('BAD_REQUEST', 'uid and email required', 400)
    }

    const { uid, displayName, photoURL, accessToken: bodyToken } = parsed.data

    // Resolve access token: body → httpOnly cookie → DB (refresh if expired)
    const cookieToken = req.cookies.get('google_access_token')?.value
    let accessToken = bodyToken || cookieToken

    // Helper: attempt token refresh via session cookie + DB
    const tryRefreshFromSession = async (): Promise<string | null> => {
      const sessionCookie = req.cookies.get(SESSION_COOKIE)?.value
      if (!sessionCookie) return null
      const sessionUid = await verifySessionCookie(sessionCookie)
      if (!sessionUid || sessionUid !== uid) return null
      return getOrRefreshAccessToken(sessionUid)
    }

    // No token from body/cookie — try DB refresh
    if (!accessToken) {
      accessToken = (await tryRefreshFromSession()) ?? undefined
    }

    if (!accessToken) {
      return apiFail('UNAUTHORIZED', 'Google access token is required — please sign in again', 401)
    }

    let googleUser = await verifyGoogleToken(accessToken)

    // Token expired/invalid — try DB refresh as last resort
    if (!googleUser) {
      const refreshed = (await tryRefreshFromSession()) ?? undefined
      if (refreshed && refreshed !== accessToken) {
        accessToken = refreshed
        googleUser = await verifyGoogleToken(accessToken)
      }
    }

    if (!googleUser) {
      return apiFail('UNAUTHORIZED', 'Invalid or expired Google access token — please sign in again', 401)
    }
    if (googleUser.sub !== uid) {
      return apiFail('FORBIDDEN', 'Token subject does not match uid', 403)
    }

    await upsertUser({
      id: uid,
      email: googleUser.email,
      displayName: displayName ?? null,
      photoURL: photoURL ?? null,
      accessToken,
    })

    const session = await createSessionCookie(uid)
    await createUserSession({
      sessionId: session.sessionId,
      userId: uid,
      expiresAt: session.expiresAt,
    })

    const cookieOpts = {
      path: '/',
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_TTL_SECONDS,
    }
    const res = apiOk({ id: uid })
    res.cookies.set(SESSION_COOKIE, session.cookie, cookieOpts)
    return res
  } catch (err) {
    return apiFailFromError(err)
  }
}
