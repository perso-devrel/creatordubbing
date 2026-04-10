import { persoFetch } from '@/lib/perso/client'
import { handle, readJson } from '@/lib/perso/route-helpers'
import type { UploadVideoResponse } from '@/lib/perso/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Body {
  spaceSeq: number
  fileUrl: string
  fileName: string
}

/**
 * PUT /api/perso/upload/register → PUT /file/api/upload/video
 *
 * camelCase body: { spaceSeq, fileUrl, fileName }
 */
export async function PUT(req: Request) {
  return handle(async () => {
    const body = await readJson<Body>(req)
    return persoFetch<UploadVideoResponse>('/file/api/upload/video', {
      method: 'PUT',
      baseURL: 'file',
      body,
    })
  })
}
