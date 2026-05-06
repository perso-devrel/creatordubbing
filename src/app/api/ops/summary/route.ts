import { NextRequest } from 'next/server'
import { apiFailFromError, apiOk } from '@/lib/api/response'
import { requireOperationsAdmin } from '@/lib/ops/admin'
import { getOpsSummary } from '@/lib/ops/observability'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireOperationsAdmin(req)
  if (!auth.ok) return auth.response

  try {
    const hours = Number.parseInt(req.nextUrl.searchParams.get('hours') ?? '24', 10)
    const summary = await getOpsSummary(Number.isFinite(hours) ? hours : 24)
    return apiOk(summary)
  } catch (err) {
    return apiFailFromError(err)
  }
}
