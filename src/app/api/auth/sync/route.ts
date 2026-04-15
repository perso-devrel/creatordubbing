import { NextRequest } from 'next/server'
import { upsertUser } from '@/lib/db/queries'
import { SESSION_COOKIE, signSessionCookie } from '@/lib/auth/session-cookie'
import { apiOk, apiFail, apiFailFromError } from '@/lib/api/response'
import { syncBodySchema } from '@/lib/validators/auth'

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

    const { uid, email, displayName, photoURL, accessToken: bodyToken } = parsed.data

    // Resolve access token: body → httpOnly cookie (set by /api/auth/callback)
    const cookieToken = req.cookies.get('google_access_token')?.value
    const accessToken = bodyToken || cookieToken

    if (!accessToken) {
      return apiFail('UNAUTHORIZED', 'Google access token is required', 401)
    }
    const googleUser = await verifyGoogleToken(accessToken)
    if (!googleUser) {
      return apiFail('UNAUTHORIZED', 'Invalid or expired Google access token', 401)
    }
    if (googleUser.sub !== uid) {
      return apiFail('FORBIDDEN', 'Token subject does not match uid', 403)
    }

    await upsertUser({
      id: uid,
      email,
      displayName: displayName ?? null,
      photoURL: photoURL ?? null,
      accessToken,
    })

    const cookieOpts = {
      path: '/',
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
    }
    const res = apiOk({ id: uid })
    res.cookies.set(SESSION_COOKIE, await signSessionCookie(uid), cookieOpts)
    res.cookies.set('google_access_token', accessToken, cookieOpts)
    return res
  } catch (err) {
    return apiFailFromError(err)
  }
}
