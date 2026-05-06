import 'server-only'

import { NextRequest } from 'next/server'
import { requireSession, type Session } from '@/lib/auth/session'
import { apiFail } from '@/lib/api/response'

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
