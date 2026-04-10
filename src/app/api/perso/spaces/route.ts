import { persoFetch } from '@/lib/perso/client'
import { handle } from '@/lib/perso/route-helpers'
import type { PersoSpace } from '@/lib/perso/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/perso/spaces → GET /portal/api/v1/spaces */
export async function GET() {
  return handle(() =>
    persoFetch<PersoSpace[]>('/portal/api/v1/spaces', { baseURL: 'api' }),
  )
}
