import { NextRequest } from 'next/server'
import {
  createDubbingJob,
  createJobLanguages,
  createDubbingJobWithLanguages,
  updateJobLanguageProgress,
  updateJobLanguageCompleted,
  updateJobStatus,
  createYouTubeUpload,
  updateJobLanguageYouTube,
  deductUserMinutes,
  addUserCredits,
  deleteDubbingJob,
} from '@/lib/db/queries'
import { requireSession } from '@/lib/auth/session'
import { mutationActionSchema, getUserIdFromAction, getJobIdFromAction } from '@/lib/validators/dashboard'
import { apiOk, apiFail, apiFailFromError } from '@/lib/api/response'
import { getDb } from '@/lib/db/client'
import { persoFetch } from '@/lib/perso/client'

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

  // Verify job ownership for job-based actions (IDOR prevention)
  const jobId = getJobIdFromAction(action)
  if (jobId !== null) {
    const db = getDb()
    const row = await db.execute({
      sql: 'SELECT user_id FROM dubbing_jobs WHERE id = ?',
      args: [jobId],
    })
    if (!row.rows[0]) {
      return apiFail('NOT_FOUND', 'Job not found', 404)
    }
    if (row.rows[0].user_id !== auth.session.uid) {
      return apiFail('FORBIDDEN', 'You do not own this job', 403)
    }
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
      case 'createDubbingJobWithLanguages': {
        const jobId = await createDubbingJobWithLanguages(action.payload.job, action.payload.languages)
        return apiOk({ jobId })
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
      case 'deductUserMinutes': {
        const { userId, jobId: deductJobId, minutes: clientMinutes } = action.payload
        const deductDb = getDb()
        const jobRow = await deductDb.execute({
          sql: 'SELECT video_duration_ms FROM dubbing_jobs WHERE id = ? AND user_id = ?',
          args: [deductJobId, auth.session.uid],
        })
        const durationMs = (jobRow.rows[0]?.video_duration_ms as number) || 0
        const serverMinutes = Math.max(1, Math.ceil(durationMs / 60_000))
        const minutes = Math.min(clientMinutes, serverMinutes)
        await deductUserMinutes(userId, minutes)
        return apiOk({ userId, minutes })
      }
      case 'addCredits': {
        const { userId, minutes } = action.payload
        await addUserCredits(userId, minutes)
        return apiOk({ userId, minutes })
      }
      case 'deleteDubbingJob': {
        const { jobId } = action.payload
        const db2 = getDb()
        const langRows = await db2.execute({
          sql: 'SELECT jl.project_seq, dj.space_seq FROM job_languages jl JOIN dubbing_jobs dj ON dj.id = jl.job_id WHERE jl.job_id = ?',
          args: [jobId],
        })
        await Promise.allSettled(
          langRows.rows.map((row) => {
            const projectSeq = row.project_seq as number
            const spaceSeq = row.space_seq as number
            if (!projectSeq || !spaceSeq) return Promise.resolve()
            return persoFetch<unknown>(
              `/video-translator/api/v1/projects/${projectSeq}/spaces/${spaceSeq}/cancel`,
              { method: 'POST', baseURL: 'api' },
            ).catch(() => {})
          }),
        )
        await deleteDubbingJob(jobId)
        return apiOk({ jobId })
      }
      default: {
        return apiFail('BAD_REQUEST', 'Unknown action type', 400)
      }
    }
  } catch (err) {
    return apiFailFromError(err)
  }
}
