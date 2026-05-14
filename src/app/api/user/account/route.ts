import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { apiFailFromError, apiOk } from '@/lib/api/response'
import { requestUserAccountDeletion } from '@/lib/db/queries'
import { SESSION_COOKIE } from '@/lib/auth/session-cookie'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const COOKIES_TO_CLEAR = [SESSION_COOKIE, 'google_access_token']

export async function DELETE(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  try {
    await requestUserAccountDeletion(auth.session.uid)
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
  } catch (err) {
    return apiFailFromError(err)
  }
}
