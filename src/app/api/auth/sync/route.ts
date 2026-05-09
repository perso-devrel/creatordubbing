import { NextRequest } from 'next/server'
import { getUser } from '@/lib/db/queries'
import { SESSION_COOKIE, verifySessionCookie } from '@/lib/auth/session-cookie'
import { apiFail, apiFailFromError, apiOk } from '@/lib/api/response'
import { syncBodySchema } from '@/lib/validators/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SESSION_EXPIRED_MESSAGE = '세션이 만료되었습니다. 다시 로그인해 주세요.'

export async function POST(req: NextRequest) {
  try {
    const parsed = syncBodySchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      return apiFail('BAD_REQUEST', 'uid and email required', 400)
    }

    const { uid } = parsed.data
    const sessionCookie = req.cookies.get(SESSION_COOKIE)?.value
    if (!sessionCookie) {
      return apiFail('UNAUTHORIZED', SESSION_EXPIRED_MESSAGE, 401)
    }

    const sessionUid = await verifySessionCookie(sessionCookie)
    if (!sessionUid || sessionUid !== uid) {
      return apiFail('UNAUTHORIZED', SESSION_EXPIRED_MESSAGE, 401)
    }

    const user = await getUser(sessionUid)
    if (!user?.email) {
      return apiFail('UNAUTHORIZED', SESSION_EXPIRED_MESSAGE, 401)
    }

    return apiOk({ id: sessionUid })
  } catch (err) {
    return apiFailFromError(err)
  }
}
