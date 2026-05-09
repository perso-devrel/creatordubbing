import { NextRequest } from 'next/server'
import { apiOk, apiFail, apiFailFromError } from '@/lib/api/response'
import { clearUserGoogleTokens, getUserTokens, isUserSessionActive } from '@/lib/db/queries'
import { SESSION_COOKIE, verifySessionCookiePayload } from '@/lib/auth/session-cookie'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke'

async function revokeGoogleToken(token: string) {
  const res = await fetch(GOOGLE_REVOKE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token }),
  })

  if (!res.ok && res.status !== 400) {
    logger.warn('google token revoke failed', { status: res.status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const raw = req.cookies.get(SESSION_COOKIE)?.value
    if (!raw) {
      return apiFail('UNAUTHORIZED', 'YouTube 연결을 해제하려면 로그인이 필요합니다.', 401)
    }

    const verified = await verifySessionCookiePayload(raw)
    if (!verified) {
      return apiFail('UNAUTHORIZED', '세션이 만료되었습니다. 다시 로그인해 주세요.', 401)
    }

    if (!verified.legacy) {
      const active = await isUserSessionActive(verified.sid, verified.uid)
      if (!active) {
        return apiFail('UNAUTHORIZED', '세션이 만료되었습니다. 다시 로그인해 주세요.', 401)
      }
    }

    const tokens = await getUserTokens(verified.uid)
    const tokenToRevoke = tokens?.refreshToken || tokens?.accessToken
    if (tokenToRevoke) {
      await revokeGoogleToken(tokenToRevoke)
    }

    await clearUserGoogleTokens(verified.uid)
    return apiOk({ disconnected: true })
  } catch (err) {
    return apiFailFromError(err)
  }
}
