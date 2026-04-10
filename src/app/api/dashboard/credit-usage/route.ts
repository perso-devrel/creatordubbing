import { NextRequest } from 'next/server'
import { getCreditUsageByMonth } from '@/lib/db/queries'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const uid = req.nextUrl.searchParams.get('uid')
  if (!uid) {
    return Response.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'uid required' } }, { status: 400 })
  }
  try {
    const data = await getCreditUsageByMonth(uid)
    return Response.json({ ok: true, data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return Response.json({ ok: false, error: { code: 'DB_ERROR', message } }, { status: 500 })
  }
}
