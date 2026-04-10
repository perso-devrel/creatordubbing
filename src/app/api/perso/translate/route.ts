import { persoFetch } from '@/lib/perso/client'
import { PersoError } from '@/lib/perso/errors'
import { handle, readJson, requireIntParam } from '@/lib/perso/route-helpers'
import type { TranslateRequest, TranslateResponse } from '@/lib/perso/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/perso/translate?spaceSeq={n}
 *   1. Auto-initializes queue (idempotent) — fixes "space queue not found" bug
 *   2. POST /video-translator/api/v1/projects/spaces/{spaceSeq}/translate
 *
 * Known failure codes: VT4043/VT4044 (language), VT5034 (queue full),
 * VT4021 (insufficient credits).
 */
export async function POST(req: Request) {
  return handle(async () => {
    const url = new URL(req.url)
    const spaceSeq = requireIntParam(url, 'spaceSeq')
    const body = await readJson<TranslateRequest>(req)

    // Step 1 — auto-initialize queue (idempotent). Swallow "already initialized"
    // style errors so translate can proceed. Hard failures surface normally.
    try {
      await persoFetch<unknown>(
        `/video-translator/api/v1/projects/spaces/${spaceSeq}/queue`,
        { method: 'PUT', baseURL: 'api' },
      )
    } catch (err) {
      // Only swallow benign errors; re-throw real failures.
      if (err instanceof PersoError && err.status >= 500) {
        throw err
      }
      // 4xx from queue init is typically "already initialized" — safe to ignore.
    }

    // Step 2 — actual translate call
    return persoFetch<TranslateResponse>(
      `/video-translator/api/v1/projects/spaces/${spaceSeq}/translate`,
      {
        method: 'POST',
        baseURL: 'api',
        body,
      },
    )
  })
}
