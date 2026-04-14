import { NextRequest } from 'next/server'
import { upsertUser } from '@/lib/db/queries'
import { SESSION_COOKIE, signSessionCookie } from '@/lib/auth/session-cookie'
import { apiOk, apiFail, apiFailFromError } from '@/lib/api/response'
import { callbackBodySchema } from '@/lib/validators/auth'
import { getServerEnv } from '@/lib/env'
import { getClientEnv } from '@/lib/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'

export async function POST(req: NextRequest) {
  try {
    const parsed = callbackBodySchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      return apiFail('BAD_REQUEST', 'code and redirectUri required', 400)
    }

    const { code, redirectUri } = parsed.data
    const serverEnv = getServerEnv()
    const clientEnv = getClientEnv()

    if (!serverEnv.GOOGLE_CLIENT_SECRET) {
      return apiFail('CONFIG_ERROR', 'GOOGLE_CLIENT_SECRET not configured', 500)
    }

    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientEnv.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        client_secret: serverEnv.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      return apiFail('TOKEN_EXCHANGE_FAILED', `Google token exchange failed: ${err}`, 401)
    }

    const tokens = (await tokenRes.json()) as {
      access_token: string
      refresh_token?: string
      expires_in: number
      token_type: string
    }

    const userRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    if (!userRes.ok) {
      return apiFail('USERINFO_FAILED', 'Failed to fetch user info', 401)
    }

    const info = (await userRes.json()) as {
      sub: string
      email: string
      name?: string
      picture?: string
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    await upsertUser({
      id: info.sub,
      email: info.email,
      displayName: info.name ?? null,
      photoURL: info.picture ?? null,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      tokenExpiresAt: expiresAt,
    })

    const cookieOpts = {
      path: '/',
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
    }

    const res = apiOk({
      id: info.sub,
      email: info.email,
      displayName: info.name ?? null,
      photoURL: info.picture ?? null,
    })
    res.cookies.set(SESSION_COOKIE, signSessionCookie(info.sub), cookieOpts)
    res.cookies.set('google_access_token', tokens.access_token, {
      ...cookieOpts,
      maxAge: tokens.expires_in,
    })
    return res
  } catch (err) {
    return apiFailFromError(err)
  }
}
