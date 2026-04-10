import { NextRequest } from 'next/server'
import { getUserDubbingJobs } from '@/lib/db/queries'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const uid = req.nextUrl.searchParams.get('uid')
  const limit = Number(req.nextUrl.searchParams.get('limit') || '10')
  if (!uid) {
    return Response.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'uid required' } }, { status: 400 })
  }
  try {
    const data = await getUserDubbingJobs(uid, limit)
    return Response.json({ ok: true, data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return Response.json({ ok: false, error: { code: 'DB_ERROR', message } }, { status: 500 })
  }
}
