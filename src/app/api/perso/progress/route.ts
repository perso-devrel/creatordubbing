import { NextResponse } from 'next/server'
import { persoFetch } from '@/lib/perso/client'
import { mapPersoError } from '@/lib/perso/errors'
import { requireIntParam } from '@/lib/perso/route-helpers'
import type { ProgressResponse } from '@/lib/perso/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/perso/progress?projectSeq={p}&spaceSeq={s}
 *   → GET /video-translator/api/v1/projects/{projectSeq}/space/{spaceSeq}/progress
 *
 * Cache-Control: no-store to prevent Next.js/CDN caching of polling responses.
 * Client polling interval: minimum 5 seconds (enforce in consumer).
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const projectSeq = requireIntParam(url, 'projectSeq')
    const spaceSeq = requireIntParam(url, 'spaceSeq')

    const data = await persoFetch<ProgressResponse>(
      `/video-translator/api/v1/projects/${projectSeq}/space/${spaceSeq}/progress`,
      { baseURL: 'api' },
    )

    return NextResponse.json(
      { ok: true as const, data },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      },
    )
  } catch (err) {
    const { status, code, message, details } = mapPersoError(err)
    return NextResponse.json(
      { ok: false as const, error: { code, message, details } },
      {
        status,
        headers: { 'Cache-Control': 'no-store' },
      },
    )
  }
}
