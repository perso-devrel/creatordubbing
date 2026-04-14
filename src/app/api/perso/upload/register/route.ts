import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { persoFetch } from '@/lib/perso/client'
import { handle, parseBody } from '@/lib/perso/route-helpers'
import { uploadRegisterBodySchema } from '@/lib/validators/perso'
import type { UploadVideoResponse } from '@/lib/perso/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  return handle(async () => {
    const body = await parseBody(req, uploadRegisterBodySchema)
    return persoFetch<UploadVideoResponse>('/file/api/upload/video', {
      method: 'PUT',
      baseURL: 'file',
      body,
    })
  })
}
