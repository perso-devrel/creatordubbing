import { persoFetch } from '@/lib/perso/client'
import { handle, requireStringParam } from '@/lib/perso/route-helpers'
import type { SasTokenResponse } from '@/lib/perso/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/perso/upload/sas-token?fileName=...
 *   → GET /file/api/upload/sas-token?fileName=...
 */
export async function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url)
    const fileName = requireStringParam(url, 'fileName')
    return persoFetch<SasTokenResponse>('/file/api/upload/sas-token', {
      baseURL: 'file',
      query: { fileName },
    })
  })
}
