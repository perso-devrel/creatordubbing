import 'server-only'

import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { requireSession, type Session } from '@/lib/auth/session'
import { apiFail } from '@/lib/api/response'
import { SESSION_COOKIE, verifySessionCookiePayload } from '@/lib/auth/session-cookie'
import { getUser, isUserSessionActive } from '@/lib/db/queries'

function getAdminEmails() {
  return (process.env.OPERATIONS_ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export function isOperationsAdmin(session: Session): boolean {
  const adminEmails = getAdminEmails()
  if (adminEmails.length === 0) {
    return process.env.NODE_ENV !== 'production'
  }
  return adminEmails.includes(session.email.toLowerCase())
}

export async function requireOperationsAdmin(
  req: NextRequest,
): Promise<
  | { ok: true; session: Session }
  | { ok: false; response: Response }
> {
  const auth = await requireSession(req)
  if (!auth.ok) return auth
  if (!isOperationsAdmin(auth.session)) {
    return {
      ok: false,
      response: apiFail('FORBIDDEN', 'Operations access is restricted', 403),
    }
  }
  return auth
}

export async function isOperationsAdminFromCookies(): Promise<boolean> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(SESSION_COOKIE)?.value
  if (!raw) return false

  const verified = await verifySessionCookiePayload(raw)
  if (!verified) return false

  if (!verified.legacy) {
    const active = await isUserSessionActive(verified.sid, verified.uid)
    if (!active) return false
  }

  const user = await getUser(verified.uid)
  const email = (user?.email as string | undefined) ?? null
  if (!email) return false

  return isOperationsAdmin({ uid: verified.uid, email })
}
