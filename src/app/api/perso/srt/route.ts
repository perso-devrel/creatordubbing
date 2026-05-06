import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { persoFetch } from '@/lib/perso/client'
import { fail, requireIntParam } from '@/lib/perso/route-helpers'
import { getPersoFileUrl } from '@/lib/api-client/perso'
import type { DownloadResponse } from '@/lib/perso/types'
import { assertPersoProjectOwner } from '@/lib/perso/ownership'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Perso가 생성한 자막 SRT 본문을 그대로 반환한다 (Content-Type: application/x-subrip).
 *
 * Flow
 *   1. GET /download?target=audioScript 로 srtFile.translatedSubtitleDownloadLink
 *      (perso-storage 상대 경로) 획득
 *   2. https://perso.ai{path} 를 서버에서 fetch (브라우저 CORS 우회)
 *   3. SRT 텍스트 그대로 반환
 *
 * 주의: Perso 공식 문서엔 originalSubtitle / translatedSubtitle target이 적혀
 * 있으나 현재 백엔드는 두 값에 대해 500을 반환한다. audioScript가 정상 동작.
 *
 * Query
 *   - projectSeq (required, integer)
 *   - spaceSeq   (required, integer)
 *   - kind       (optional, default 'translated') — 'translated' | 'original'
 */
export async function GET(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  try {
    const url = new URL(req.url)
    const projectSeq = requireIntParam(url, 'projectSeq')
    const spaceSeq = requireIntParam(url, 'spaceSeq')
    const kind = url.searchParams.get('kind') === 'original' ? 'original' : 'translated'
    await assertPersoProjectOwner(auth.session.uid, projectSeq)

    const data = await persoFetch<DownloadResponse>(
      `/video-translator/api/v1/projects/${projectSeq}/spaces/${spaceSeq}/download`,
      { baseURL: 'api', query: { target: 'audioScript' } },
    )

    const path =
      kind === 'translated'
        ? data.srtFile?.translatedSubtitleDownloadLink
        : data.srtFile?.originalSubtitleDownloadLink

    if (!path) {
      throw Object.assign(new Error(`No ${kind} subtitle link in audioScript response`), {
        name: 'PersoError',
        code: 'SRT_NOT_AVAILABLE',
        status: 404,
      })
    }

    const fileUrl = path.startsWith('http') ? path : getPersoFileUrl(path)
    const res = await fetch(fileUrl)
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw Object.assign(new Error(`Failed to fetch SRT: ${body}`), {
        name: 'PersoError',
        code: 'SRT_FETCH_FAILED',
        status: res.status,
      })
    }

    const srt = await res.text()
    return new Response(srt, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-subrip; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    return fail(err)
  }
}
