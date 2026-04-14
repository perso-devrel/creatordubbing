import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { persoFetch } from '@/lib/perso/client'
import { handle, requireStringParam } from '@/lib/perso/route-helpers'
import type { SasTokenResponse } from '@/lib/perso/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  return handle(async () => {
    const url = new URL(req.url)
    const fileName = requireStringParam(url, 'fileName')
    return persoFetch<SasTokenResponse>('/file/api/upload/sas-token', {
      baseURL: 'file',
      query: { fileName },
    })
  })
}
