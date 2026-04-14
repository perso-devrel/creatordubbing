import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { persoFetch } from '@/lib/perso/client'
import { handle } from '@/lib/perso/route-helpers'
import type { PersoSpace } from '@/lib/perso/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  return handle(() =>
    persoFetch<PersoSpace[]>('/portal/api/v1/spaces', { baseURL: 'api' }),
  )
}
