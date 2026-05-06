import { NextRequest } from 'next/server'
import { apiOk } from '@/lib/api/response'
import { revokeUserSession } from '@/lib/db/queries'
import { SESSION_COOKIE, verifySessionCookiePayload } from '@/lib/auth/session-cookie'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const COOKIES_TO_CLEAR = [SESSION_COOKIE, 'google_access_token']

export async function POST(req: NextRequest) {
  const raw = req.cookies.get(SESSION_COOKIE)?.value
  if (raw) {
    const verified = await verifySessionCookiePayload(raw)
    if (verified && !verified.legacy) {
      try {
        await revokeUserSession(verified.sid)
      } catch {
        // Signout should still clear client cookies even if server-side revocation fails.
      }
    }
  }

  const res = apiOk(null)
  for (const name of COOKIES_TO_CLEAR) {
    res.cookies.set(name, '', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 0,
    })
  }
  return res
}
