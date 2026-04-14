import { NextRequest } from 'next/server'
import { upsertUser } from '@/lib/db/queries'
import { SESSION_COOKIE, signSessionCookie } from '@/lib/auth/session-cookie'
import { apiOk, apiFail, apiFailFromError } from '@/lib/api/response'
import { syncBodySchema } from '@/lib/validators/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const parsed = syncBodySchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      return apiFail('BAD_REQUEST', 'uid and email required', 400)
    }

    const { uid, email, displayName, photoURL, accessToken } = parsed.data
    await upsertUser({
      id: uid,
      email,
      displayName: displayName ?? null,
      photoURL: photoURL ?? null,
      accessToken: accessToken ?? null,
    })

    const cookieOpts = {
      path: '/',
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
    }
    const res = apiOk({ id: uid })
    res.cookies.set(SESSION_COOKIE, signSessionCookie(uid), cookieOpts)
    if (accessToken) {
      res.cookies.set('google_access_token', accessToken, cookieOpts)
    }
    return res
  } catch (err) {
    return apiFailFromError(err)
  }
}
