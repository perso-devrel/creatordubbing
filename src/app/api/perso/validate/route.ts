import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { persoFetch } from '@/lib/perso/client'
import { handle, parseBody } from '@/lib/perso/route-helpers'
import { mediaValidateBodySchema } from '@/lib/validators/perso'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  return handle(async () => {
    const body = await parseBody(req, mediaValidateBodySchema)
    const extension = body.extension.startsWith('.') ? body.extension : `.${body.extension}`
    return persoFetch<{ valid?: boolean } | null>(
      '/file/api/v1/media/validate',
      {
        method: 'POST',
        baseURL: 'file',
        body: { ...body, extension },
      },
    )
  })
}
