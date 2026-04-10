import { persoFetch } from '@/lib/perso/client'
import { handle } from '@/lib/perso/route-helpers'
import type { PersoLanguage } from '@/lib/perso/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/perso/languages → GET /video-translator/api/v1/languages */
export async function GET() {
  return handle(async () => {
    const data = await persoFetch<
      { languages: PersoLanguage[] } | PersoLanguage[]
    >('/video-translator/api/v1/languages', { baseURL: 'api' })
    // Normalize: API may return either { languages: [...] } or the array directly
    if (Array.isArray(data)) return data
    return data.languages ?? []
  })
}
