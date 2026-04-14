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
import { requireSession } from '@/lib/auth/session'
import { mutationActionSchema, getUserIdFromAction } from '@/lib/validators/dashboard'
import { apiOk, apiFail } from '@/lib/api/response'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return apiFail('BAD_REQUEST', 'Invalid JSON body', 400)
  }

  const parsed = mutationActionSchema.safeParse(body)
  if (!parsed.success) {
    return apiFail('BAD_REQUEST', parsed.error.issues.map((i) => i.message).join('; '), 400)
  }

  const action = parsed.data
  const actionUserId = getUserIdFromAction(action)
  if (actionUserId && actionUserId !== auth.session.uid) {
    return apiFail('FORBIDDEN', 'UID mismatch: you can only mutate your own data', 403)
  }

  try {
    switch (action.type) {
      case 'createDubbingJob': {
        const jobId = await createDubbingJob(action.payload)
        return apiOk({ jobId })
      }
      case 'createJobLanguages': {
        await createJobLanguages(action.payload.jobId, action.payload.languages)
        return apiOk({ jobId: action.payload.jobId })
      }
      case 'updateJobLanguageProgress': {
        const { jobId, langCode, status, progress, progressReason } = action.payload
        await updateJobLanguageProgress(jobId, langCode, status, progress, progressReason)
        return apiOk({ jobId, langCode })
      }
      case 'updateJobLanguageCompleted': {
        const { jobId, langCode, urls } = action.payload
        await updateJobLanguageCompleted(jobId, langCode, urls)
        return apiOk({ jobId, langCode })
      }
      case 'updateJobStatus': {
        const { jobId, status } = action.payload
        await updateJobStatus(jobId, status)
        return apiOk({ jobId })
      }
      case 'createYouTubeUpload': {
        const id = await createYouTubeUpload(action.payload)
        return apiOk({ id })
      }
      case 'updateJobLanguageYouTube': {
        const { jobId, langCode, youtubeVideoId } = action.payload
        await updateJobLanguageYouTube(jobId, langCode, youtubeVideoId)
        return apiOk({ jobId, langCode })
      }
      default: {
        return apiFail('BAD_REQUEST', 'Unknown action type', 400)
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return apiFail('DB_ERROR', message, 500)
  }
}
