import { NextRequest } from 'next/server'
import { getUserSummary } from '@/lib/db/queries'
import { requireSession, forbiddenUidMismatch } from '@/lib/auth/session'
import { summaryQuerySchema } from '@/lib/validators/dashboard'
import { apiOk, apiFail } from '@/lib/api/response'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  const parsed = summaryQuerySchema.safeParse({
    uid: req.nextUrl.searchParams.get('uid'),
  })
  if (!parsed.success) {
    return apiFail('BAD_REQUEST', 'uid required', 400)
  }

  if (parsed.data.uid !== auth.session.uid) return forbiddenUidMismatch()

  try {
    const data = await getUserSummary(auth.session.uid)
    return apiOk(data)
  } catch {
    return apiFail('DB_ERROR', 'Failed to load summary', 500)
  }
}
