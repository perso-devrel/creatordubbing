import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSession } from '@/lib/auth/session'
import { translateMetadata, TranslateError } from '@/lib/translate/gemini'
import { logger } from '@/lib/logger'

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
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'INVALID_BODY',
          message: '입력값을 확인해 주세요.',
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
      const isConfigError =
        err.code === 'GEMINI_NOT_CONFIGURED' ||
        err.code === 'VERTEX_NOT_CONFIGURED' ||
        err.code === 'VERTEX_INVALID_CREDENTIALS'
      const status = isConfigError ? 503 : 502
      logger.warn('metadata translation failed', { code: err.code, status, message: err.message })
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: err.code,
            message: isConfigError
              ? '번역 기능을 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.'
              : '제목과 설명을 번역하지 못했습니다. 잠시 후 다시 시도해 주세요.',
          },
        },
        { status },
      )
    }
    logger.error('metadata translation unexpected error', {
      message: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'TRANSLATE_FAILED',
          message: '제목과 설명을 번역하지 못했습니다. 잠시 후 다시 시도해 주세요.',
        },
      },
      { status: 500 },
    )
  }
}
