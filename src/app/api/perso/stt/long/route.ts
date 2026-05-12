import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { getDb } from '@/lib/db/client'
import {
  getSttCaptionSegments,
  releaseJobCredits,
  updateJobLanguageProgress,
  updateJobLanguageProjects,
  updateJobStatus,
  updateSttCaptionSegmentProgress,
  upsertSttCaptionSegments,
} from '@/lib/db/queries'
import { buildLongSttSegmentPlanForSource } from '@/lib/long-stt/media'
import { processLongSttCaptionJob } from '@/lib/long-stt/process'
import { persoFetch } from '@/lib/perso/client'
import { PersoError } from '@/lib/perso/errors'
import { assertPersoMediaOwner } from '@/lib/perso/ownership'
import { handle, parseBody, requireIntParam } from '@/lib/perso/route-helpers'
import { startLongSttBodySchema } from '@/lib/validators/perso'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const LONG_VIDEO_LIMIT_MS = 30 * 60 * 1000

async function getOwnedLongSttJob(jobId: number, userId: string) {
  const result = await getDb().execute({
    sql: `SELECT id, user_id, media_seq, space_seq, video_title, video_duration_ms, original_video_url
          FROM dubbing_jobs
          WHERE id = ?
          LIMIT 1`,
    args: [jobId],
  })
  const row = result.rows[0]
  if (!row) throw new PersoError('JOB_NOT_FOUND', 'Job not found', 404)
  if (String(row.user_id) !== userId) {
    throw new PersoError('FORBIDDEN', 'You do not own this job', 403)
  }
  const durationMs = Number(row.video_duration_ms ?? 0)
  if (durationMs <= LONG_VIDEO_LIMIT_MS) {
    throw new PersoError('NOT_LONG_STT_JOB', 'This job does not require long STT processing', 400)
  }
  const originalVideoUrl = row.original_video_url ? String(row.original_video_url) : ''
  if (!originalVideoUrl) {
    throw new PersoError('MISSING_ORIGINAL_VIDEO_URL', 'Original video URL is required for long STT processing', 409)
  }
  return {
    id: Number(row.id),
    mediaSeq: Number(row.media_seq),
    spaceSeq: Number(row.space_seq),
    title: String(row.video_title ?? ''),
    durationMs,
    originalVideoUrl,
  }
}

async function getJobLanguageCodes(jobId: number) {
  const result = await getDb().execute({
    sql: 'SELECT language_code FROM job_languages WHERE job_id = ? ORDER BY id ASC',
    args: [jobId],
  })
  return result.rows.map((row) => String(row.language_code))
}

export async function POST(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  return handle(async () => {
    const body = await parseBody(req, startLongSttBodySchema)
    const job = await getOwnedLongSttJob(body.jobId, auth.session.uid)
    await assertPersoMediaOwner(auth.session.uid, job.mediaSeq)

    let segments = await getSttCaptionSegments(job.id)
    if (segments.length === 0) {
      const plan = await buildLongSttSegmentPlanForSource({
        originalVideoUrl: job.originalVideoUrl,
        durationMs: job.durationMs,
      })
      await upsertSttCaptionSegments(plan.map((segment) => ({
        userId: auth.session.uid,
        jobId: job.id,
        segmentIndex: segment.segmentIndex,
        logicalStartMs: segment.logicalStartMs,
        logicalEndMs: segment.logicalEndMs,
        exportStartMs: segment.exportStartMs,
        exportEndMs: segment.exportEndMs,
        mediaSeq: 0,
        projectSeq: 0,
        status: 'pending',
        progress: 0,
        progressReason: 'STT_SEGMENT_PLANNED',
      })))
      const languageCodes = await getJobLanguageCodes(job.id)
      await Promise.all(languageCodes.map((code) => (
        updateJobLanguageProgress(job.id, code, 'transcribing', 0, 'STT_SEGMENT_PREPARING')
      )))
      segments = await getSttCaptionSegments(job.id)
    }

    const status = await processLongSttCaptionJob(job.id, { prepareLimit: 1 })
    segments = await getSttCaptionSegments(job.id)
    const firstProjectSeq = segments.find((segment) => segment.projectSeq > 0)?.projectSeq ?? 0
    if (firstProjectSeq > 0) {
      const languageCodes = await getJobLanguageCodes(job.id)
      await updateJobLanguageProjects(job.id, languageCodes.map((code) => ({ code, projectSeq: firstProjectSeq })))
    }

    return {
      jobId: job.id,
      status,
      segments: segments.map((segment) => ({
        segmentIndex: segment.segmentIndex,
        mediaSeq: segment.mediaSeq,
        projectSeq: segment.projectSeq,
        logicalStartMs: segment.logicalStartMs,
        logicalEndMs: segment.logicalEndMs,
        exportStartMs: segment.exportStartMs,
        exportEndMs: segment.exportEndMs,
      })),
    }
  })
}

export async function GET(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  return handle(async () => {
    const url = new URL(req.url)
    const jobId = requireIntParam(url, 'jobId')
    await getOwnedLongSttJob(jobId, auth.session.uid)
    return processLongSttCaptionJob(jobId)
  })
}

export async function DELETE(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  return handle(async () => {
    const url = new URL(req.url)
    const jobId = requireIntParam(url, 'jobId')
    const job = await getOwnedLongSttJob(jobId, auth.session.uid)
    const segments = await getSttCaptionSegments(jobId)
    await Promise.allSettled(segments.map((segment) => (
      persoFetch<unknown>(
        `/video-translator/api/v1/projects/${segment.projectSeq}/spaces/${job.spaceSeq}/cancel`,
        { method: 'POST', baseURL: 'api' },
      )
    )))
    await Promise.all(segments.map((segment) => updateSttCaptionSegmentProgress(
      jobId,
      segment.segmentIndex,
      'failed',
      segment.progress,
      'CANCELED',
    )))
    const languageCodes = await getJobLanguageCodes(jobId)
    await Promise.all(languageCodes.map((code) => updateJobLanguageProgress(
      jobId,
      code,
      'failed',
      0,
      'CANCELED',
    )))
    await releaseJobCredits(auth.session.uid, jobId, 'user_cancelled')
    await updateJobStatus(jobId, 'failed')
    return { jobId, canceledSegments: segments.length }
  })
}
