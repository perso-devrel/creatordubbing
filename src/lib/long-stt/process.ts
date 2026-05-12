import 'server-only'

import { getDb } from '@/lib/db/client'
import {
  claimSttCaptionSegmentPreparation,
  completeSttCaptionSegmentPreparation,
  finalizeJobCredits,
  getGeneratedCaption,
  getSttCaptionSegments,
  markSttCaptionSegmentPreparationFailed,
  updateJobLanguageCompleted,
  updateJobLanguageProgress,
  updateJobStatus,
  updateSttCaptionSegmentProgress,
  upsertGeneratedCaption,
  upsertSttCaptionSegments,
  type SttCaptionSegment,
} from '@/lib/db/queries'
import { parseJobUploadSettings } from '@/lib/dubbing/job-upload-settings'
import { buildLongSttSegmentPlanForSource, prepareLongSttSegment } from '@/lib/long-stt/media'
import { persoFetch } from '@/lib/perso/client'
import { PersoError } from '@/lib/perso/errors'
import { fetchAllSttScript, mapSttSegments } from '@/lib/perso/stt-script'
import type { ProgressResponse } from '@/lib/perso/types'
import { translateTimedSubtitles, type TimedTranscriptSegment } from '@/lib/translate/gemini'
import { buildSRT } from '@/utils/srt'

interface JobRow {
  id: number
  userId: string
  spaceSeq: number
  status: string
  title: string
  durationMs: number
  originalVideoUrl: string
}

interface JobLanguageRow {
  languageCode: string
  status: string
  progressReason: string
}

const MAX_SEGMENT_PREP_ATTEMPTS = 3
const DEFAULT_PREPARE_LIMIT = 1

export interface LongSttCaptionStatus {
  jobId: number
  status: 'preparing' | 'transcribing' | 'translating' | 'completed' | 'failed'
  progress: number
  segments: Array<{
    segmentIndex: number
    projectSeq: number
    status: string
    progress: number
    progressReason: string
  }>
  languages: Array<{
    langCode: string
    status: string
    progress: number
    progressReason: string
    srtUrl?: string
    error?: string
  }>
}

function isCompleted(reason: string) {
  return reason === 'COMPLETED' || reason === 'Completed'
}

function isFailed(reason: string) {
  return reason === 'FAILED' || reason === 'Failed' || reason === 'CANCELED'
}

function isTerminalLanguage(lang: JobLanguageRow) {
  return lang.status === 'completed' ||
    lang.status === 'failed' ||
    isCompleted(lang.progressReason) ||
    isFailed(lang.progressReason)
}

function mapProgressReasonToStatus(reason: string) {
  switch (reason) {
    case 'PENDING':
    case 'CREATED':
    case 'Enqueue Pending':
    case 'Slow Mode Pending':
      return 'transcribing'
    case 'READY':
    case 'READY_TARGET_LANGUAGES':
    case 'Transcribing':
    case 'Translating':
    case 'PROCESSING':
      return 'transcribing'
    case 'COMPLETED':
    case 'Completed':
      return 'completed'
    case 'FAILED':
    case 'CANCELED':
    case 'Failed':
      return 'failed'
    default:
      return 'transcribing'
  }
}

async function getJob(jobId: number): Promise<JobRow> {
  const result = await getDb().execute({
    sql: `SELECT id, user_id, space_seq, status, video_title, video_duration_ms, original_video_url
          FROM dubbing_jobs
          WHERE id = ?
          LIMIT 1`,
    args: [jobId],
  })
  const row = result.rows[0]
  if (!row) throw new PersoError('JOB_NOT_FOUND', 'Job not found', 404)
  return {
    id: Number(row.id),
    userId: String(row.user_id),
    spaceSeq: Number(row.space_seq),
    status: String(row.status ?? ''),
    title: String(row.video_title ?? ''),
    durationMs: Number(row.video_duration_ms ?? 0),
    originalVideoUrl: row.original_video_url ? String(row.original_video_url) : '',
  }
}

async function getJobLanguages(jobId: number): Promise<JobLanguageRow[]> {
  const result = await getDb().execute({
    sql: `SELECT language_code, status, progress_reason
          FROM job_languages
          WHERE job_id = ?
          ORDER BY id ASC`,
    args: [jobId],
  })
  return result.rows.map((row) => ({
    languageCode: String(row.language_code),
    status: String(row.status ?? ''),
    progressReason: String(row.progress_reason ?? ''),
  }))
}

function captionUrl(jobId: number, langCode: string) {
  const params = new URLSearchParams({ jobId: String(jobId), langCode })
  return `/api/perso/stt/captions?${params.toString()}`
}

async function fetchProgress(segment: SttCaptionSegment, spaceSeq: number) {
  return persoFetch<ProgressResponse>(
    `/video-translator/api/v1/projects/${segment.projectSeq}/space/${spaceSeq}/progress`,
    { baseURL: 'api' },
  )
}

async function refreshSegmentProgress(job: JobRow, segments: SttCaptionSegment[]) {
  const updated: SttCaptionSegment[] = []
  for (const segment of segments) {
    if (segment.projectSeq <= 0) {
      updated.push(segment)
      continue
    }
    if (isCompleted(segment.progressReason) || isFailed(segment.progressReason)) {
      updated.push(segment)
      continue
    }
    const progress = await fetchProgress(segment, job.spaceSeq)
    const status = mapProgressReasonToStatus(progress.progressReason)
    await updateSttCaptionSegmentProgress(
      job.id,
      segment.segmentIndex,
      status,
      progress.progress,
      progress.progressReason,
    )
    updated.push({
      ...segment,
      status,
      progress: progress.progress,
      progressReason: progress.progressReason,
    })
  }
  return updated
}

async function updateActiveLanguagesProgress(
  jobId: number,
  languages: JobLanguageRow[],
  status: string,
  progress: number,
  progressReason: string,
) {
  await Promise.all(languages
    .filter((lang) => !isTerminalLanguage(lang))
    .map((lang) => updateJobLanguageProgress(
      jobId,
      lang.languageCode,
      status,
      progress,
      progressReason,
    )))
}

async function failActiveLanguages(job: JobRow, languages: JobLanguageRow[], reason: string) {
  await updateActiveLanguagesProgress(job.id, languages, 'failed', 0, reason)
  await updateJobStatus(job.id, 'failed')
  await finalizeJobCredits(job.userId, job.id)
}

async function ensureSegmentPlan(job: JobRow, currentSegments: SttCaptionSegment[]) {
  if (currentSegments.length > 0) return currentSegments
  if (!job.originalVideoUrl) {
    throw new PersoError('MISSING_ORIGINAL_VIDEO_URL', 'Original video URL is required for long STT processing', 409)
  }

  const plan = await buildLongSttSegmentPlanForSource({
    originalVideoUrl: job.originalVideoUrl,
    durationMs: job.durationMs,
  })
  await upsertSttCaptionSegments(plan.map((segment) => ({
    userId: job.userId,
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
  return getSttCaptionSegments(job.id)
}

async function preparePendingSegments(
  job: JobRow,
  segments: SttCaptionSegment[],
  prepareLimit: number,
) {
  if (!job.originalVideoUrl) {
    throw new PersoError('MISSING_ORIGINAL_VIDEO_URL', 'Original video URL is required for long STT processing', 409)
  }

  const pending = segments
    .filter((segment) => segment.projectSeq <= 0 && !isFailed(segment.progressReason))
    .sort((a, b) => a.segmentIndex - b.segmentIndex)
    .slice(0, Math.max(0, prepareLimit))

  for (const segment of pending) {
    const claimed = await claimSttCaptionSegmentPreparation(
      job.id,
      segment.segmentIndex,
      MAX_SEGMENT_PREP_ATTEMPTS,
    )
    if (!claimed) continue

    try {
      const prepared = await prepareLongSttSegment({
        userId: job.userId,
        jobId: job.id,
        spaceSeq: job.spaceSeq,
        originalVideoUrl: job.originalVideoUrl,
        title: job.title,
        segment,
        totalSegments: segments.length,
      })
      await completeSttCaptionSegmentPreparation(job.id, segment.segmentIndex, {
        mediaSeq: prepared.mediaSeq,
        projectSeq: prepared.projectSeq,
      })
    } catch (err) {
      const retryable = segment.attemptCount + 1 < MAX_SEGMENT_PREP_ATTEMPTS
      await markSttCaptionSegmentPreparationFailed(job.id, segment.segmentIndex, {
        retryable,
        error: err instanceof Error ? err.message : 'segment_prepare_failed',
      })
    }
  }

  return getSttCaptionSegments(job.id)
}

function toAbsoluteTranscriptSegments(segments: SttCaptionSegment[], perSegment: TimedTranscriptSegment[][]) {
  const lastSegmentIndex = Math.max(...segments.map((segment) => segment.segmentIndex))
  const absolute: TimedTranscriptSegment[] = []

  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i]
    const transcript = perSegment[i] ?? []
    for (const item of transcript) {
      const startMs = segment.exportStartMs + item.startMs
      const endMs = segment.exportStartMs + item.endMs
      const midpoint = (startMs + endMs) / 2
      const isLast = segment.segmentIndex === lastSegmentIndex
      if (midpoint < segment.logicalStartMs) continue
      if (!isLast && midpoint >= segment.logicalEndMs) continue
      absolute.push({
        ...item,
        id: absolute.length + 1,
        startMs: Math.max(0, Math.round(startMs)),
        endMs: Math.max(0, Math.round(endMs)),
      })
    }
  }

  return dedupeTranscriptSegments(absolute)
}

function dedupeTranscriptSegments(segments: TimedTranscriptSegment[]) {
  const sorted = segments
    .filter((segment) => segment.text.trim().length > 0 && segment.endMs > segment.startMs)
    .sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs)
  const result: TimedTranscriptSegment[] = []

  for (const segment of sorted) {
    const normalized = normalizeText(segment.text)
    const duplicate = result.slice(-5).some((prev) => {
      if (normalizeText(prev.text) !== normalized) return false
      const overlap = Math.min(prev.endMs, segment.endMs) - Math.max(prev.startMs, segment.startMs)
      const shorter = Math.min(prev.endMs - prev.startMs, segment.endMs - segment.startMs)
      return overlap > 0 && overlap / Math.max(1, shorter) >= 0.35
    })
    if (duplicate) continue
    result.push({ ...segment, id: result.length + 1 })
  }

  return result
}

function normalizeText(text: string) {
  return text.toLowerCase().replace(/\s+/g, ' ').replace(/[^\p{L}\p{N} ]/gu, '').trim()
}

async function buildMergedTranscript(job: JobRow, segments: SttCaptionSegment[]) {
  const perSegment: TimedTranscriptSegment[][] = []
  for (const segment of segments) {
    const sentences = await fetchAllSttScript(segment.projectSeq, job.spaceSeq)
    perSegment.push(mapSttSegments(sentences))
  }
  const merged = toAbsoluteTranscriptSegments(segments, perSegment)
  if (merged.length === 0) {
    throw new PersoError('STT_SCRIPT_EMPTY', 'STT script is empty or not ready yet', 409)
  }
  return merged
}

async function generateCaptions(job: JobRow, languages: JobLanguageRow[], segments: SttCaptionSegment[]) {
  const merged = await buildMergedTranscript(job, segments)
  const failedLanguages: Array<{ langCode: string; error: string }> = []
  const completedLanguages: Array<{ langCode: string; srtUrl: string; cueCount: number }> = []
  const alreadyFailed = languages.some((lang) => lang.status === 'failed' || isFailed(lang.progressReason))

  for (const lang of languages.filter((item) => !isTerminalLanguage(item))) {
    try {
      await updateJobLanguageProgress(job.id, lang.languageCode, 'translating', 72, 'STT_CAPTION_TRANSLATING')
      const existing = await getGeneratedCaption(job.id, lang.languageCode)
      if (existing) {
        const srtUrl = captionUrl(job.id, lang.languageCode)
        await updateJobLanguageCompleted(job.id, lang.languageCode, { srtUrl })
        completedLanguages.push({ langCode: lang.languageCode, srtUrl, cueCount: existing.cueCount })
        continue
      }

      const cues = await translateTimedSubtitles({
        sourceLanguageCode: 'auto',
        targetLanguageCode: lang.languageCode,
        segments: merged,
      })
      const srtContent = buildSRT(cues)
      await upsertGeneratedCaption({
        userId: job.userId,
        jobId: job.id,
        languageCode: lang.languageCode,
        sourceProjectSeq: null,
        sourceType: 'stt_long',
        srtContent,
        cueCount: cues.length,
      })
      const srtUrl = captionUrl(job.id, lang.languageCode)
      await updateJobLanguageCompleted(job.id, lang.languageCode, { srtUrl })
      completedLanguages.push({ langCode: lang.languageCode, srtUrl, cueCount: cues.length })
    } catch (err) {
      await updateJobLanguageProgress(job.id, lang.languageCode, 'failed', 0, 'FAILED')
      failedLanguages.push({
        langCode: lang.languageCode,
        error: err instanceof Error ? err.message : 'caption_generation_failed',
      })
    }
  }

  await updateJobStatus(job.id, failedLanguages.length > 0 || alreadyFailed ? 'failed' : 'completed')
  await finalizeJobCredits(job.userId, job.id)
  return { completedLanguages, failedLanguages }
}

export async function processLongSttCaptionJob(
  jobId: number,
  options: { prepareLimit?: number } = {},
): Promise<LongSttCaptionStatus> {
  const job = await getJob(jobId)
  const [languages, currentSegments] = await Promise.all([
    getJobLanguages(jobId),
    getSttCaptionSegments(jobId),
  ])

  if (languages.length > 0 && languages.every((lang) => isTerminalLanguage(lang))) {
    const anyLanguageFailed = languages.some((lang) => lang.status === 'failed' || isFailed(lang.progressReason))
    return buildStatus(jobId, anyLanguageFailed ? 'failed' : 'completed', anyLanguageFailed ? 0 : 100, currentSegments, languages)
  }

  let segments = await ensureSegmentPlan(job, currentSegments)
  const failedUnstartedSegment = segments.some((segment) => segment.projectSeq <= 0 && isFailed(segment.progressReason))
  if (failedUnstartedSegment) {
    await failActiveLanguages(job, languages, 'FAILED')
    const freshLanguages = await getJobLanguages(jobId)
    return buildStatus(jobId, 'failed', 0, segments, freshLanguages)
  }

  const pendingSegments = segments.filter((segment) => segment.projectSeq <= 0 && !isFailed(segment.progressReason))
  if (pendingSegments.length > 0) {
    segments = await preparePendingSegments(job, segments, options.prepareLimit ?? DEFAULT_PREPARE_LIMIT)
    const preparedCount = segments.filter((segment) => segment.projectSeq > 0).length
    const prepProgress = Math.min(10, Math.max(0, Math.round((preparedCount / Math.max(1, segments.length)) * 10)))
    await updateActiveLanguagesProgress(jobId, languages, 'transcribing', prepProgress, 'STT_SEGMENT_PREPARING')
    const freshLanguages = await getJobLanguages(jobId)
    return buildStatus(jobId, 'preparing', prepProgress, segments, freshLanguages)
  }

  segments = await refreshSegmentProgress(job, segments)
  const anySegmentFailed = segments.some((segment) => isFailed(segment.progressReason))
  if (anySegmentFailed) {
    await failActiveLanguages(job, languages, 'FAILED')
    const freshLanguages = await getJobLanguages(jobId)
    return buildStatus(jobId, 'failed', 0, segments, freshLanguages)
  }

  const allSegmentsCompleted = segments.every((segment) => isCompleted(segment.progressReason))
  if (!allSegmentsCompleted) {
    const sttProgress = Math.min(
      70,
      Math.max(0, Math.round(segments.reduce((sum, segment) => sum + segment.progress, 0) / segments.length * 0.7)),
    )
    await updateActiveLanguagesProgress(jobId, languages, 'transcribing', sttProgress, 'STT_SEGMENT_TRANSCRIBING')
    const freshLanguages = await getJobLanguages(jobId)
    return buildStatus(jobId, 'transcribing', sttProgress, segments, freshLanguages)
  }

  await updateActiveLanguagesProgress(jobId, languages, 'translating', 72, 'STT_CAPTION_TRANSLATING')
  await generateCaptions(job, languages, segments)
  const freshLanguages = await getJobLanguages(jobId)
  const anyLanguageFailed = freshLanguages.some((lang) => lang.status === 'failed' || isFailed(lang.progressReason))
  return buildStatus(jobId, anyLanguageFailed ? 'failed' : 'completed', anyLanguageFailed ? 0 : 100, segments, freshLanguages)
}

async function buildStatus(
  jobId: number,
  status: LongSttCaptionStatus['status'],
  fallbackProgress: number,
  segments: SttCaptionSegment[],
  languages: JobLanguageRow[],
): Promise<LongSttCaptionStatus> {
  const languageItems = []
  for (const lang of languages) {
    const caption = lang.status === 'completed'
      ? await getGeneratedCaption(jobId, lang.languageCode).catch(() => null)
      : null
    languageItems.push({
      langCode: lang.languageCode,
      status: lang.status,
      progress: lang.status === 'completed' ? 100 : fallbackProgress,
      progressReason: lang.progressReason || (lang.status === 'completed' ? 'COMPLETED' : 'PENDING'),
      srtUrl: caption ? captionUrl(jobId, lang.languageCode) : undefined,
    })
  }
  return {
    jobId,
    status,
    progress: fallbackProgress,
    segments: segments.map((segment) => ({
      segmentIndex: segment.segmentIndex,
      projectSeq: segment.projectSeq,
      status: segment.status,
      progress: segment.progress,
      progressReason: segment.progressReason,
    })),
    languages: languageItems,
  }
}

export async function processLongSttCaptionJobs(options: { limit?: number } = {}) {
  const limit = Math.min(50, Math.max(1, options.limit ?? 20))
  const result = await getDb().execute({
    sql: `SELECT id, upload_settings_json, deliverable_mode, video_duration_ms
          FROM dubbing_jobs
          WHERE status NOT IN ('completed', 'failed')
            AND deliverable_mode = 'originalWithMultiAudio'
            AND video_duration_ms > ?
          ORDER BY updated_at ASC, created_at ASC
          LIMIT ?`,
    args: [30 * 60 * 1000, limit],
  })

  const processed = []
  for (const row of result.rows) {
    const settings = parseJobUploadSettings(String(row.upload_settings_json ?? ''))
    if (!settings.uploadSettings.uploadCaptions || settings.uploadSettings.captionGenerationMode !== 'stt') {
      continue
    }
    const jobId = Number(row.id)
    try {
      processed.push(await processLongSttCaptionJob(jobId))
    } catch (err) {
      processed.push({
        jobId,
        status: 'failed',
        progress: 0,
        segments: [],
        languages: [],
        error: err instanceof Error ? err.message : 'long_stt_processing_failed',
      })
    }
  }

  return { processed: processed.length, results: processed }
}
