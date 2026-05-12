import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { getDb } from '@/lib/db/client'
import { getGeneratedCaption, upsertGeneratedCaption } from '@/lib/db/queries/generated-captions'
import { updateJobLanguageCompleted, updateJobLanguageProgress } from '@/lib/db/queries/jobs'
import { persoFetch } from '@/lib/perso/client'
import { PersoError } from '@/lib/perso/errors'
import { fail, handle, parseBody, requireIntParam, requireStringParam } from '@/lib/perso/route-helpers'
import { generateSttCaptionsBodySchema } from '@/lib/validators/perso'
import type { SttScriptResponse, SttScriptSentence } from '@/lib/perso/types'
import { translateTimedSubtitles, type TimedTranscriptSegment } from '@/lib/translate/gemini'
import { buildSRT } from '@/utils/srt'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

async function assertJobOwner(userId: string, jobId: number) {
  const result = await getDb().execute({
    sql: 'SELECT user_id FROM dubbing_jobs WHERE id = ?',
    args: [jobId],
  })
  const owner = result.rows[0]?.user_id
  if (!owner) throw new PersoError('JOB_NOT_FOUND', 'Job not found', 404)
  if (owner !== userId) throw new PersoError('FORBIDDEN', 'You do not own this job', 403)
}

async function assertProjectBelongsToJob(jobId: number, projectSeq: number) {
  const result = await getDb().execute({
    sql: 'SELECT id FROM job_languages WHERE job_id = ? AND project_seq = ? LIMIT 1',
    args: [jobId, projectSeq],
  })
  if (!result.rows[0]) {
    throw new PersoError('PERSO_RESOURCE_FORBIDDEN', 'Project is not linked to this job', 403)
  }
}

async function assertLanguagesBelongToJob(jobId: number, languageCodes: string[]) {
  const result = await getDb().execute({
    sql: 'SELECT language_code FROM job_languages WHERE job_id = ?',
    args: [jobId],
  })
  const allowed = new Set(result.rows.map((row) => String(row.language_code)))
  const invalid = languageCodes.filter((code) => !allowed.has(code))
  if (invalid.length > 0) {
    throw new PersoError('LANGUAGE_NOT_LINKED_TO_JOB', 'Requested language is not linked to this job', 403, {
      invalid,
    })
  }
}

async function fetchAllSttScript(projectSeq: number, spaceSeq: number): Promise<SttScriptSentence[]> {
  const sentences: SttScriptSentence[] = []
  let cursorId: number | null | undefined

  for (let page = 0; page < 100; page += 1) {
    const data = await persoFetch<SttScriptResponse>(
      `/video-translator/api/v1/projects/${projectSeq}/spaces/${spaceSeq}/stt/script`,
      {
        baseURL: 'api',
        query: {
          size: 10000,
          cursorId,
        },
      },
    )

    if (Array.isArray(data.sentences)) {
      sentences.push(...data.sentences)
    }

    if (!data.hasNext || data.nextCursorId == null) break
    cursorId = data.nextCursorId
  }

  return sentences
}

function mapSttSegments(sentences: SttScriptSentence[]): TimedTranscriptSegment[] {
  return sentences
    .map((sentence, index) => {
      const startMs = Number(sentence.offsetMs ?? 0)
      const durationMs = Number(sentence.durationMs ?? 0)
      const endMs = startMs + durationMs
      return {
        id: Number(sentence.seq ?? index + 1),
        startMs,
        endMs,
        text: String(sentence.originalText || sentence.originalDraftText || '').trim(),
        speakerLabel: sentence.speakerOrderIndex ? `Speaker ${sentence.speakerOrderIndex}` : undefined,
      }
    })
    .filter((segment) => segment.text.length > 0 && segment.endMs > segment.startMs)
}

function captionUrl(jobId: number, langCode: string) {
  const params = new URLSearchParams({ jobId: String(jobId), langCode })
  return `/api/perso/stt/captions?${params.toString()}`
}

export async function GET(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  try {
    const url = new URL(req.url)
    const jobId = requireIntParam(url, 'jobId')
    const langCode = requireStringParam(url, 'langCode')
    await assertJobOwner(auth.session.uid, jobId)

    const caption = await getGeneratedCaption(jobId, langCode)
    if (!caption) throw new PersoError('CAPTION_NOT_FOUND', 'Generated caption was not found', 404)
    if (caption.userId !== auth.session.uid) throw new PersoError('FORBIDDEN', 'You do not own this caption', 403)

    return new Response(caption.srtContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-subrip; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    return fail(err)
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  return handle(async () => {
    const body = await parseBody(req, generateSttCaptionsBodySchema)
    await assertJobOwner(auth.session.uid, body.jobId)
    await assertProjectBelongsToJob(body.jobId, body.projectSeq)
    const targetLanguageCodes = Array.from(new Set(body.targetLanguageCodes))
    await assertLanguagesBelongToJob(body.jobId, targetLanguageCodes)

    const sentences = await fetchAllSttScript(body.projectSeq, body.spaceSeq)
    const segments = mapSttSegments(sentences)
    if (segments.length === 0) {
      throw new PersoError('STT_SCRIPT_EMPTY', 'STT script is empty or not ready yet', 409)
    }

    const languages = []
    const failedLanguages = []
    for (const langCode of targetLanguageCodes) {
      try {
        await updateJobLanguageProgress(body.jobId, langCode, 'translating', 72, 'STT_CAPTION_TRANSLATING')
        const cues = await translateTimedSubtitles({
          sourceLanguageCode: body.sourceLanguageCode ?? 'auto',
          targetLanguageCode: langCode,
          segments,
        })
        const srtContent = buildSRT(cues)
        await upsertGeneratedCaption({
          userId: auth.session.uid,
          jobId: body.jobId,
          languageCode: langCode,
          sourceProjectSeq: body.projectSeq,
          srtContent,
          cueCount: cues.length,
        })
        const srtUrl = captionUrl(body.jobId, langCode)
        await updateJobLanguageCompleted(body.jobId, langCode, { srtUrl })
        languages.push({
          langCode,
          srtUrl,
          cueCount: cues.length,
        })
      } catch (err) {
        await updateJobLanguageProgress(body.jobId, langCode, 'failed', 0, 'FAILED')
        failedLanguages.push({
          langCode,
          error: err instanceof Error ? err.message : 'caption_generation_failed',
        })
      }
    }

    if (languages.length === 0) {
      throw new PersoError('CAPTION_GENERATION_FAILED', 'Caption generation failed for all languages', 502, {
        failedLanguages,
      })
    }

    return { languages, failedLanguages }
  })
}
