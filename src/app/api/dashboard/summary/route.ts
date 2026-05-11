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
    return apiFail('BAD_REQUEST', '로그인 정보를 확인해 주세요.', 400)
  }

  if (parsed.data.uid !== auth.session.uid) return forbiddenUidMismatch()

  try {
    const data = await getUserSummary(auth.session.uid)
    return apiOk(data)
  } catch {
    return apiFail('DB_ERROR', '대시보드 요약을 불러오지 못했습니다.', 500)
  }
}
