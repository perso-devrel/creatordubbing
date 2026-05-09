import { NextRequest } from 'next/server'
import { createUserSession, upsertUser } from '@/lib/db/queries'
import { createSessionCookie, SESSION_COOKIE, SESSION_TTL_SECONDS } from '@/lib/auth/session-cookie'
import { apiOk, apiFail, apiFailFromError } from '@/lib/api/response'
import { callbackBodySchema } from '@/lib/validators/auth'
import { getServerEnv } from '@/lib/env'
import { getClientEnv } from '@/lib/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'

function getAllowedRedirectOrigins(req: NextRequest) {
  const origins = new Set<string>([req.nextUrl.origin])
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (siteUrl) {
    try {
      origins.add(new URL(siteUrl).origin)
    } catch {
      // Environment validation handles malformed public URLs where they are required.
    }
  }
  if (process.env.VERCEL_URL) {
    origins.add(`https://${process.env.VERCEL_URL}`)
  }
  return origins
}

function getVerifiedRedirectUri(req: NextRequest, redirectUri: string): string | null {
  try {
    const parsed = new URL(redirectUri)
    if (parsed.pathname !== '/auth/callback') return null
    if (parsed.search || parsed.hash) return null
    if (!getAllowedRedirectOrigins(req).has(parsed.origin)) return null
    return parsed.toString()
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const parsed = callbackBodySchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      return apiFail('BAD_REQUEST', 'code and redirectUri required', 400)
    }

    const { code, redirectUri } = parsed.data
    const serverEnv = getServerEnv()
    const clientEnv = getClientEnv()
    const verifiedRedirectUri = getVerifiedRedirectUri(req, redirectUri)
    if (!verifiedRedirectUri) {
      return apiFail('INVALID_REDIRECT_URI', '허용되지 않은 로그인 요청입니다. 다시 시도해 주세요.', 400)
    }

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
        redirect_uri: verifiedRedirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      return apiFail('TOKEN_EXCHANGE_FAILED', 'Google token exchange failed', 401)
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

    const session = await createSessionCookie(info.sub)
    await createUserSession({
      sessionId: session.sessionId,
      userId: info.sub,
      expiresAt: session.expiresAt,
    })

    const cookieOpts = {
      path: '/',
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_TTL_SECONDS,
    }

    const res = apiOk({
      id: info.sub,
      email: info.email,
      displayName: info.name ?? null,
      photoURL: info.picture ?? null,
    })
    res.cookies.set(SESSION_COOKIE, session.cookie, cookieOpts)
    return res
  } catch (err) {
    return apiFailFromError(err)
  }
}
