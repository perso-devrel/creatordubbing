import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSession } from '@/lib/auth/session'
import { translateMetadata, TranslateError } from '@/lib/translate/gemini'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const bodySchema = z.object({
  title: z.string().min(1).max(2000),
  description: z.string().max(20000).default(''),
  sourceLang: z.string().min(1),
  targetLangs: z.array(z.string().min(1)).min(1).max(50),
})

export async function POST(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  let parsed: z.infer<typeof bodySchema>
  try {
    parsed = bodySchema.parse(await req.json())
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'INVALID_BODY',
          message: err instanceof z.ZodError ? err.issues[0]?.message ?? 'Invalid body' : 'Invalid body',
        },
      },
      { status: 400 },
    )
  }

  try {
    const translations = await translateMetadata(parsed)
    return NextResponse.json({ ok: true, data: { translations } })
  } catch (err) {
    if (err instanceof TranslateError) {
      const status = err.code === 'GEMINI_NOT_CONFIGURED' ? 503 : 502
      return NextResponse.json(
        { ok: false, error: { code: err.code, message: err.message } },
        { status },
      )
    }
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'TRANSLATE_FAILED',
          message: err instanceof Error ? err.message : 'Unknown error',
        },
      },
      { status: 500 },
    )
  }
}
