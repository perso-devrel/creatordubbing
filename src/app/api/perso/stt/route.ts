import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { persoFetch } from '@/lib/perso/client'
import { handle, parseBody, requireIntParam } from '@/lib/perso/route-helpers'
import { sttBodySchema } from '@/lib/validators/perso'
import type { SttResponse } from '@/lib/perso/types'
import { assertPersoMediaOwner } from '@/lib/perso/ownership'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function normalizeSttResponse(raw: unknown): SttResponse {
  if (raw && typeof raw === 'object') {
    const data = raw as Record<string, unknown>
    if (Array.isArray(data.startGenerateProjectIdList)) {
      return {
        startGenerateProjectIdList: data.startGenerateProjectIdList
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id > 0),
      }
    }
    const singleId = Number(data.projectSeq ?? data.projectId ?? data.sttProjectSeq)
    if (Number.isFinite(singleId) && singleId > 0) {
      return { startGenerateProjectIdList: [singleId] }
    }
  }
  return { startGenerateProjectIdList: [] }
}

export async function POST(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  return handle(async () => {
    const url = new URL(req.url)
    const spaceSeq = requireIntParam(url, 'spaceSeq')
    const body = await parseBody(req, sttBodySchema)
    await assertPersoMediaOwner(auth.session.uid, body.mediaSeq)

    const title = body.title?.trim() || `Dubtube STT project ${body.mediaSeq}`
    const raw = await persoFetch<unknown>(
      `/video-translator/api/v1/projects/spaces/${spaceSeq}/stt`,
      {
        method: 'POST',
        baseURL: 'api',
        body: {
          mediaSeq: body.mediaSeq,
          isVideoProject: body.isVideoProject,
          title,
        },
      },
    )

    return normalizeSttResponse(raw)
  })
}
