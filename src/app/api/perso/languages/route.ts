import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { persoFetch } from '@/lib/perso/client'
import { handle } from '@/lib/perso/route-helpers'
import type { PersoLanguage } from '@/lib/perso/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  return handle(async () => {
    const data = await persoFetch<
      { languages: PersoLanguage[] } | PersoLanguage[]
    >('/video-translator/api/v1/languages', { baseURL: 'api' })
    if (Array.isArray(data)) return data
    return data.languages ?? []
  })
}
