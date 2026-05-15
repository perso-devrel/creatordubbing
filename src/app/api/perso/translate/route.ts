import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { persoFetch } from '@/lib/perso/client'
import { PersoError } from '@/lib/perso/errors'
import { handle, parseBody, requireIntParam } from '@/lib/perso/route-helpers'
import { translateBodySchema } from '@/lib/validators/perso'
import type { TranslateResponse } from '@/lib/perso/types'
import { assertPersoMediaOwner } from '@/lib/perso/ownership'
import { logger } from '@/lib/logger'
import { DEFAULT_TTS_MODEL } from '@/lib/perso/tts-model'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  return handle(async () => {
    const url = new URL(req.url)
    const spaceSeq = requireIntParam(url, 'spaceSeq')
    const body = await parseBody(req, translateBodySchema)
    await assertPersoMediaOwner(auth.session.uid, body.mediaSeq)

    try {
      await persoFetch<unknown>(
        `/video-translator/api/v1/projects/spaces/${spaceSeq}/queue`,
        { method: 'PUT', baseURL: 'api' },
      )
    } catch (err) {
      if (err instanceof PersoError && err.status >= 500) {
        throw err
      }
    }

    const title = body.title?.trim() || `sub2tube project ${body.mediaSeq}`
    const customDictionaryBlobPath = body.customDictionaryBlobPath?.trim()
    const srtBlobPath = body.srtBlobPath?.trim()
    const persoBody = {
      mediaSeq: body.mediaSeq,
      isVideoProject: body.isVideoProject,
      sourceLanguageCode: body.sourceLanguageCode.trim() || 'auto',
      targetLanguageCodes: body.targetLanguageCodes.map((code) => code.trim()),
      numberOfSpeakers: body.numberOfSpeakers,
      withLipSync: body.withLipSync ?? false,
      preferredSpeedType: body.preferredSpeedType,
      ttsModel: body.ttsModel ?? DEFAULT_TTS_MODEL,
      title,
      ...(customDictionaryBlobPath ? { customDictionaryBlobPath } : {}),
      ...(srtBlobPath ? { srtBlobPath } : {}),
    }

    try {
      return await persoFetch<TranslateResponse>(
        `/video-translator/api/v1/projects/spaces/${spaceSeq}/translate`,
        {
          method: 'POST',
          baseURL: 'api',
          body: persoBody,
        },
      )
    } catch (err) {
      if (err instanceof PersoError && err.status === 400) {
        logger.warn('perso translate rejected', {
          code: err.code,
          message: err.message,
          body: persoBody,
        })
      }
      throw err
    }
  })
}
