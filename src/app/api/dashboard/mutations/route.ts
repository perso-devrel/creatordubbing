import { NextRequest } from 'next/server'
import {
  createDubbingJob,
  createJobLanguages,
  updateJobLanguageProgress,
  updateJobLanguageCompleted,
  updateJobStatus,
  createYouTubeUpload,
  updateJobLanguageYouTube,
} from '@/lib/db/queries'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Action =
  | {
      type: 'createDubbingJob'
      payload: {
        userId: string
        videoTitle: string
        videoDurationMs: number
        videoThumbnail: string
        sourceLanguage: string
        mediaSeq: number
        spaceSeq: number
        lipSyncEnabled: boolean
        isShort: boolean
      }
    }
  | {
      type: 'createJobLanguages'
      payload: { jobId: number; languages: { code: string; projectSeq: number }[] }
    }
  | {
      type: 'updateJobLanguageProgress'
      payload: {
        jobId: number
        langCode: string
        status: string
        progress: number
        progressReason: string
      }
    }
  | {
      type: 'updateJobLanguageCompleted'
      payload: {
        jobId: number
        langCode: string
        urls: { dubbedVideoUrl?: string; audioUrl?: string; srtUrl?: string }
      }
    }
  | { type: 'updateJobStatus'; payload: { jobId: number; status: string } }
  | {
      type: 'createYouTubeUpload'
      payload: {
        userId: string
        jobLanguageId?: number
        youtubeVideoId: string
        title: string
        languageCode: string
        privacyStatus: string
        isShort: boolean
      }
    }
  | {
      type: 'updateJobLanguageYouTube'
      payload: { jobId: number; langCode: string; youtubeVideoId: string }
    }

function ok<T>(data: T) {
  return Response.json({ ok: true, data })
}

function fail(code: string, message: string, status = 400) {
  return Response.json({ ok: false, error: { code, message } }, { status })
}

export async function POST(req: NextRequest) {
  let action: Action
  try {
    action = (await req.json()) as Action
  } catch {
    return fail('BAD_REQUEST', 'Invalid JSON body', 400)
  }
  if (!action || typeof action !== 'object' || !('type' in action)) {
    return fail('BAD_REQUEST', 'Missing action.type', 400)
  }

  try {
    switch (action.type) {
      case 'createDubbingJob': {
        const jobId = await createDubbingJob(action.payload)
        return ok({ jobId })
      }
      case 'createJobLanguages': {
        await createJobLanguages(action.payload.jobId, action.payload.languages)
        return ok({ jobId: action.payload.jobId })
      }
      case 'updateJobLanguageProgress': {
        const { jobId, langCode, status, progress, progressReason } = action.payload
        await updateJobLanguageProgress(jobId, langCode, status, progress, progressReason)
        return ok({ jobId, langCode })
      }
      case 'updateJobLanguageCompleted': {
        const { jobId, langCode, urls } = action.payload
        await updateJobLanguageCompleted(jobId, langCode, urls)
        return ok({ jobId, langCode })
      }
      case 'updateJobStatus': {
        const { jobId, status } = action.payload
        await updateJobStatus(jobId, status)
        return ok({ jobId })
      }
      case 'createYouTubeUpload': {
        const id = await createYouTubeUpload(action.payload)
        return ok({ id })
      }
      case 'updateJobLanguageYouTube': {
        const { jobId, langCode, youtubeVideoId } = action.payload
        await updateJobLanguageYouTube(jobId, langCode, youtubeVideoId)
        return ok({ jobId, langCode })
      }
      default: {
        return fail('BAD_REQUEST', `Unknown action: ${(action as { type: string }).type}`, 400)
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return fail('DB_ERROR', message, 500)
  }
}
