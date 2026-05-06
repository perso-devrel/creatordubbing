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
    const summary = await getOpsSummary(24)
    return apiOk({
      generatedAt: summary.generatedAt,
      count: summary.alerts.length,
      alerts: summary.alerts,
    })
  } catch (err) {
    return apiFailFromError(err)
  }
}
