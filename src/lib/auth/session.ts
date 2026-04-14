import 'server-only'

import { NextRequest } from 'next/server'
import { apiFail } from '@/lib/api/response'

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

export async function requireSession(
  req: NextRequest,
): Promise<
  | { ok: true; session: Session }
  | { ok: false; response: Response }
> {
  const token = getAccessToken(req)
  if (!token) {
    return {
      ok: false,
      response: apiFail('UNAUTHORIZED', 'Missing access token', 401),
    }
  }

  try {
    const res = await fetch(`${GOOGLE_TOKENINFO_URL}?access_token=${encodeURIComponent(token)}`)
    if (!res.ok) {
      return {
        ok: false,
        response: apiFail('UNAUTHORIZED', 'Invalid or expired access token', 401),
      }
    }

    const info = (await res.json()) as GoogleTokenInfo
    if (!info.sub || !info.email) {
      return {
        ok: false,
        response: apiFail('UNAUTHORIZED', 'Token missing required claims', 401),
      }
    }

    return { ok: true, session: { uid: info.sub, email: info.email } }
  } catch {
    return {
      ok: false,
      response: apiFail('AUTH_ERROR', 'Failed to verify access token', 500),
    }
  }
}

export function forbiddenUidMismatch(): Response {
  return apiFail('FORBIDDEN', 'UID mismatch: you can only access your own data', 403)
}
