import { NextRequest } from 'next/server'
import { getCreditUsageByMonth } from '@/lib/db/queries'
import { requireSession, forbiddenUidMismatch } from '@/lib/auth/session'
import { creditUsageQuerySchema } from '@/lib/validators/dashboard'
import { apiOk, apiFail } from '@/lib/api/response'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  const parsed = creditUsageQuerySchema.safeParse({
    uid: req.nextUrl.searchParams.get('uid'),
  })
  if (!parsed.success) {
    return apiFail('BAD_REQUEST', 'uid required', 400)
  }

  if (parsed.data.uid !== auth.session.uid) return forbiddenUidMismatch()

  try {
    const data = await getCreditUsageByMonth(auth.session.uid)
    return apiOk(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return apiFail('DB_ERROR', message, 500)
  }
}
