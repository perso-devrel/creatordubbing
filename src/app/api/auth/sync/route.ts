import { NextRequest } from 'next/server'
import { upsertUser } from '@/lib/db/queries'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { uid, email, displayName, photoURL, accessToken } = body
    if (!uid || !email) {
      return Response.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'uid and email required' } }, { status: 400 })
    }
    await upsertUser({ id: uid, email, displayName: displayName ?? null, photoURL: photoURL ?? null, accessToken: accessToken ?? null })
    return Response.json({ ok: true, data: { id: uid } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return Response.json({ ok: false, error: { code: 'DB_ERROR', message } }, { status: 500 })
  }
}
