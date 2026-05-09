import { NextRequest } from 'next/server'
import { getCompletedJobLanguages } from '@/lib/db/queries'
import { requireSession, forbiddenUidMismatch } from '@/lib/auth/session'
import { apiOk, apiFail, apiFailFromError } from '@/lib/api/response'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  const uid = req.nextUrl.searchParams.get('uid')
  if (!uid) return apiFail('BAD_REQUEST', '로그인 정보를 확인해 주세요.', 400)
  if (uid !== auth.session.uid) return forbiddenUidMismatch()

  try {
    const data = await getCompletedJobLanguages(auth.session.uid)
    return apiOk(data)
  } catch (err) {
    return apiFailFromError(err)
  }
}
