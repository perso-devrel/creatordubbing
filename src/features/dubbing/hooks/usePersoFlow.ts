'use client'

import { useCallback, useRef } from 'react'
import { useDubbingStore } from '../store/dubbingStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useAuthStore } from '@/stores/authStore'
import { useAppLocale, useLocaleText } from '@/hooks/useLocaleText'
import { countText, text } from '@/lib/i18n/text'
import { useI18nStore } from '@/stores/i18nStore'
import {
  getSpaces,
  uploadVideoFile as persoUploadVideoFile,
  getExternalMetadata,
  uploadExternalVideo,
  initializeQueue,
  submitTranslation,
  getProjectProgress,
  getDownloadLinks,
  getPersoFileUrl,
  cancelProject,
} from '@/lib/api-client'
import type { DownloadTarget } from '@/lib/perso/types'
import type { LanguageProgress } from '../types/dubbing.types'
import { dbMutation, dbMutationStrict } from '@/lib/api/dbMutation'

const POLL_INTERVAL_MIN = 8_000   // 첫 폴링: 8초
const POLL_INTERVAL_MAX = 30_000  // 최대 간격: 30초
const POLL_BACKOFF = 1.5          // 매 폴링마다 1.5배씩 증가
const POLL_FINALIZING = 2_000     // 100%인데 COMPLETED 아직 안 온 경우 빠르게 재확인
const DEFAULT_SOURCE_LANGUAGE = 'auto'
const DEFAULT_SPEAKER_COUNT = 1

function mapProgressReasonToStatus(reason: string) {
  switch (reason) {
    case 'PENDING':
    case 'CREATED':
    case 'Enqueue Pending':
    case 'Slow Mode Pending':
      return 'transcribing' as const
    case 'READY':
    case 'READY_TARGET_LANGUAGES':
    case 'Transcribing':
    case 'Translating':
      return 'translating' as const
    case 'ENQUEUED':
    case 'Uploading':
    case 'Generating Voice':
      return 'synthesizing' as const
    case 'PROCESSING':
    case 'Analyzing Lip Sync':
    case 'Applying Lip Sync':
      return 'merging' as const
    case 'COMPLETED':
    case 'Completed':
      return 'completed' as const
    case 'FAILED':
    case 'CANCELED':
    case 'Failed':
      return 'failed' as const
    default:
      return 'translating' as const
  }
}

const store = useDubbingStore

async function saveJobToDb(
  mediaSeq: number,
  spaceSeq: number,
  selectedLanguages: string[],
  projectMap: Record<string, number>,
  lipSyncEnabled: boolean,
  sourceLanguage: string,
): Promise<number> {
  const userId = useAuthStore.getState().user?.uid
  const videoMeta = store.getState().videoMeta
  const isShort = store.getState().isShort
  if (!userId) {
    throw new Error(text(useI18nStore.getState().appLocale, { ko: '로그인이 필요합니다.', en: 'Please sign in first.' }))
  }

  const result = await dbMutationStrict<{ jobId: number }>({
    type: 'createDubbingJobWithLanguages',
    payload: {
      job: {
        userId,
        videoTitle: videoMeta?.title || '',
        videoDurationMs: videoMeta?.durationMs || 0,
        videoThumbnail: videoMeta?.thumbnail || '',
        sourceLanguage,
        mediaSeq,
        spaceSeq,
        lipSyncEnabled,
        isShort,
      },
      languages: selectedLanguages.map((code) => ({ code, projectSeq: projectMap[code] || 0 })),
    },
  })
  store.getState().setDbJobId(result.jobId)
  return result.jobId
}

async function pollLanguage(
  langCode: string,
  projectSeq: number,
  spaceSeq: number,
  pollTimers: Record<string, ReturnType<typeof setTimeout>>,
  addToast: ReturnType<typeof useNotificationStore.getState>['addToast'],
): Promise<boolean | 'finalizing'> { // true = terminal, 'finalizing' = 100% but not COMPLETED yet
  const progress = await getProjectProgress(projectSeq, spaceSeq)
  const status = mapProgressReasonToStatus(progress.progressReason)
  store.getState().updateLanguageProgress(langCode, {
    status,
    progress: progress.progress,
    progressReason: progress.progressReason,
  })

  const dbJobId = store.getState().dbJobId
  if (dbJobId) {
    dbMutation({
      type: 'updateJobLanguageProgress',
      payload: { jobId: dbJobId, langCode, status, progress: progress.progress, progressReason: progress.progressReason },
    }).catch(() => { /* progress update is best-effort */ })
  }

  const reason = progress.progressReason
  const isTerminal = reason === 'COMPLETED' || reason === 'Completed' || reason === 'FAILED' || reason === 'Failed' || reason === 'CANCELED'
  if (!isTerminal) {
    // progress hit 100 but backend hasn't confirmed COMPLETED yet — poll fast
    if (progress.progress >= 100) return 'finalizing'
    return false
  }

  clearTimeout(pollTimers[langCode])
  delete pollTimers[langCode]

  if (reason === 'COMPLETED' || reason === 'Completed') {
    try {
      const downloads = await getDownloadLinks(projectSeq, spaceSeq, 'all')
      // Normalize to absolute URLs — Perso may return relative paths which break
      // server-side fetch in /api/youtube/upload (requires http-prefixed URLs).
      const toAbs = (u?: string | null) =>
        u ? (u.startsWith('http') ? u : getPersoFileUrl(u)) : undefined
      const absVideoUrl = toAbs(downloads.videoFile?.videoDownloadLink)
      const absAudioUrl = toAbs(downloads.audioFile?.voiceAudioDownloadLink)
      const absSrtUrl = toAbs(downloads.srtFile?.translatedSubtitleDownloadLink)

      store.getState().updateLanguageProgress(langCode, {
        audioUrl: absAudioUrl,
        srtUrl: absSrtUrl,
        dubbingVideoUrl: absVideoUrl,
      })
      if (dbJobId) {
        dbMutation({
          type: 'updateJobLanguageCompleted',
          payload: {
            jobId: dbJobId,
            langCode,
            urls: {
              dubbedVideoUrl: absVideoUrl,
              audioUrl: absAudioUrl,
              srtUrl: absSrtUrl,
            },
          },
        }).catch(() => { /* completion update is best-effort */ })
      }
    } catch {
      // Download links will be fetched later if needed
    }
  }

  const allProgress = store.getState().languageProgress
  const allDone = allProgress.every(
    (lp) => lp.progressReason === 'COMPLETED' || lp.progressReason === 'Completed' || lp.progressReason === 'FAILED' || lp.progressReason === 'Failed' || lp.progressReason === 'CANCELED',
  )
  if (!allDone) return true

  const anyFailed = allProgress.some((lp) => lp.progressReason === 'FAILED' || lp.progressReason === 'Failed')
  const newStatus = anyFailed ? 'failed' : 'completed'

  // Idempotency: skip deduction if the job was already finalized in a
  // previous polling cycle (e.g. user navigated away and came back).
  const prevJobStatus = store.getState().jobStatus
  const alreadyFinalized = prevJobStatus === 'completed' || prevJobStatus === 'failed'
  store.getState().setJobStatus(newStatus)

  const userId = useAuthStore.getState().user?.uid
  if (userId && dbJobId && !alreadyFinalized) {
    await dbMutationStrict({ type: 'finalizeJobCredits', payload: { jobId: dbJobId } })
  }
  if (dbJobId) {
    await dbMutation({ type: 'updateJobStatus', payload: { jobId: dbJobId, status: newStatus } })
  }
  const locale = useI18nStore.getState().appLocale
  addToast({
    type: anyFailed ? 'warning' : 'success',
    title: anyFailed
      ? text(locale, { ko: '일부 언어 처리에 실패했습니다', en: 'Dubbing finished with some errors' })
      : text(locale, { ko: '더빙이 완료되었습니다', en: 'Dubbing complete' }),
  })
  return true
}

async function cancelAllProjects(
  addToast: ReturnType<typeof useNotificationStore.getState>['addToast'],
  reason: string,
) {
  const { spaceSeq, projectMap, languageProgress } = store.getState()
  if (!spaceSeq) return

  const activeLangs = languageProgress.filter(
    (lp) => lp.progressReason !== 'COMPLETED' && lp.progressReason !== 'Completed' &&
            lp.progressReason !== 'FAILED' && lp.progressReason !== 'Failed' &&
            lp.progressReason !== 'CANCELED',
  )

  await Promise.allSettled(
    activeLangs.map(async (lp) => {
      const projectSeq = projectMap[lp.langCode]
      if (!projectSeq) return
      try {
        await cancelProject(projectSeq, spaceSeq)
      } catch {
        // Perso returns 400 if not cancelable — ignore
      }
      store.getState().updateLanguageProgress(lp.langCode, {
        status: 'failed',
        progressReason: 'CANCELED',
      })
    }),
  )

  const dbJobId = store.getState().dbJobId
  if (dbJobId) {
    dbMutation({ type: 'releaseJobCredits', payload: { jobId: dbJobId, reason: 'user_cancelled' } }).catch(() => {})
    dbMutation({ type: 'updateJobStatus', payload: { jobId: dbJobId, status: 'failed' } }).catch(() => {})
  }
  store.getState().setJobStatus('failed')
  addToast({ type: 'warning', title: reason })
}

export function usePersoFlow() {
  const addToast = useNotificationStore((s) => s.addToast)
  const locale = useAppLocale()
  const t = useLocaleText()
  const pollTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const initSpace = useCallback(async () => {
    try {
      const spaces = await getSpaces()
      if (spaces.length > 0) {
        const space = spaces[0]
        store.getState().setSpaceSeq(space.spaceSeq)
        return space.spaceSeq
      }
      throw new Error(t({ ko: '작업 공간을 찾지 못했습니다. API 설정을 확인해 주세요.', en: 'No workspace was found. Check your API settings.' }))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t({ ko: '작업 공간을 불러오지 못했습니다.', en: 'Failed to load workspace.' })
      addToast({ type: 'error', title: t({ ko: '작업 공간 오류', en: 'Workspace error' }), message: msg })
      throw err
    }
  }, [addToast, t])

  const uploadLocalVideo = useCallback(async (file: File) => {
    let spaceSeq = store.getState().spaceSeq
    if (!spaceSeq) spaceSeq = await initSpace()

    addToast({ type: 'info', title: t({ ko: '영상을 업로드하는 중...', en: 'Uploading video...' }), message: file.name })

    try {
      const result = await persoUploadVideoFile(spaceSeq!, file)
      store.getState().setMediaSeq(result.seq)
      if (result.videoFilePath) {
        store.getState().setOriginalVideoUrl(getPersoFileUrl(result.videoFilePath))
      }
      store.getState().setVideoMeta({
        id: String(result.seq),
        title: file.name.replace(/\.\w+$/, ''),
        thumbnail: result.thumbnailFilePath ? getPersoFileUrl(result.thumbnailFilePath) : '',
        duration: Math.round(result.durationMs / 1000),
        durationMs: result.durationMs,
        channelTitle: t({ ko: '직접 업로드한 파일', en: 'Uploaded file' }),
      })
      addToast({
        type: 'success',
        title: t({ ko: '영상 업로드 완료', en: 'Video uploaded' }),
        message: t({ ko: `${file.name} 더빙을 준비했습니다.`, en: `${file.name} is ready for dubbing.` }),
      })
      return result
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t({ ko: '업로드하지 못했습니다.', en: 'Upload failed.' })
      addToast({ type: 'error', title: t({ ko: '업로드 실패', en: 'Upload failed' }), message: msg })
      throw err
    }
  }, [initSpace, addToast, t])

  const importVideoByUrl = useCallback(async (url: string) => {
    let spaceSeq = store.getState().spaceSeq
    if (!spaceSeq) spaceSeq = await initSpace()

    const isYouTube = /(?:youtube\.com|youtu\.be)/.test(url)
    addToast({
      type: 'info',
      title: isYouTube
        ? t({ ko: 'YouTube에서 영상을 가져오는 중...', en: 'Importing from YouTube...' })
        : t({ ko: '영상 URL을 가져오는 중...', en: 'Importing video URL...' }),
      duration: 8000,
    })

    try {
      const meta = await getExternalMetadata(spaceSeq!, url, DEFAULT_SOURCE_LANGUAGE)
      store.getState().setVideoMeta({
        id: url,
        title: meta.originalName || (isYouTube ? t({ ko: 'YouTube 영상', en: 'YouTube video' }) : t({ ko: '외부 영상', en: 'External video' })),
        thumbnail: meta.thumbnailFilePath ? getPersoFileUrl(meta.thumbnailFilePath) : '',
        duration: Math.round(meta.durationMs / 1000),
        durationMs: meta.durationMs,
        channelTitle: isYouTube ? 'YouTube' : t({ ko: '외부 링크', en: 'External link' }),
        width: meta.width,
        height: meta.height,
      })

      const result = await uploadExternalVideo(spaceSeq!, url, DEFAULT_SOURCE_LANGUAGE)
      store.getState().setMediaSeq(result.seq)

      addToast({ type: 'success', title: t({ ko: '영상 가져오기 완료', en: 'Video imported' }) })
      return result
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t({ ko: '영상을 가져오지 못했습니다.', en: 'Failed to import video.' })
      addToast({ type: 'error', title: t({ ko: '영상 가져오기 실패', en: 'Import failed' }), message: msg })
      throw err
    }
  }, [initSpace, addToast, t])

  const submitDubbing = useCallback(async () => {
    const { spaceSeq, mediaSeq, selectedLanguages, lipSyncEnabled, videoMeta } = store.getState()
    if (!spaceSeq || !mediaSeq) {
      throw new Error(t({ ko: '영상 정보를 찾지 못했습니다. 처음부터 다시 시도해 주세요.', en: 'Missing video information. Please start again.' }))
    }
    const targetLanguages = Array.from(new Set(selectedLanguages))

    addToast({
      type: 'info',
      title: t({ ko: '더빙 작업을 시작하는 중...', en: 'Starting dubbing job...' }),
      message: countText(locale, targetLanguages.length, { ko: '개 언어', en: 'languages' }),
    })

    try {
      try {
        await initializeQueue(spaceSeq)
      } catch {
        // Already initialized
      }

      const pendingProjectMap = Object.fromEntries(targetLanguages.map((lang) => [lang, 0]))
      const dbJobId = await saveJobToDb(
        mediaSeq,
        spaceSeq,
        targetLanguages,
        pendingProjectMap,
        lipSyncEnabled,
        DEFAULT_SOURCE_LANGUAGE,
      )
      await dbMutationStrict({ type: 'reserveJobCredits', payload: { jobId: dbJobId } })

      const result = await submitTranslation(spaceSeq, {
        mediaSeq,
        isVideoProject: true,
        sourceLanguageCode: DEFAULT_SOURCE_LANGUAGE,
        targetLanguageCodes: targetLanguages,
        numberOfSpeakers: DEFAULT_SPEAKER_COUNT,
        withLipSync: lipSyncEnabled,
        preferredSpeedType: 'GREEN',
        ttsModel: 'ELEVEN_V2',
        title: videoMeta?.title?.trim() || `Dubtube project ${mediaSeq}`,
      })

      const projectIds = result.startGenerateProjectIdList || []
      const projectMap: Record<string, number> = {}
      targetLanguages.forEach((lang, i) => {
        if (projectIds[i]) {
          projectMap[lang] = projectIds[i]
        }
      })
      store.getState().setProjectMap(projectMap)

      const initialProgress: LanguageProgress[] = targetLanguages.map((code) => ({
        langCode: code,
        projectSeq: projectMap[code] || 0,
        status: 'transcribing',
        progress: 0,
        progressReason: 'PENDING',
      }))
      store.getState().setLanguageProgress(initialProgress)
      store.getState().setJobStatus('transcribing')

      await dbMutationStrict({
        type: 'updateJobLanguageProjects',
        payload: {
          jobId: dbJobId,
          languages: targetLanguages.map((code) => ({ code, projectSeq: projectMap[code] || 0 })),
        },
      })

      addToast({
        type: 'success',
        title: t({ ko: '더빙을 시작했습니다', en: 'Dubbing started' }),
        message: countText(locale, projectIds.length, { ko: '개 언어 처리 중', en: 'languages processing' }),
      })
      return projectMap
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t({ ko: '더빙 작업을 시작하지 못했습니다.', en: 'Failed to start dubbing.' })
      addToast({ type: 'error', title: t({ ko: '더빙 시작 실패', en: 'Dubbing failed' }), message: msg })
      const dbJobId = store.getState().dbJobId
      if (dbJobId) {
        dbMutation({ type: 'releaseJobCredits', payload: { jobId: dbJobId, reason: 'submission_failed' } }).catch(() => {})
        dbMutation({ type: 'updateJobStatus', payload: { jobId: dbJobId, status: 'failed' } }).catch(() => {})
      }
      store.getState().setJobStatus('failed')
      throw err
    }
  }, [addToast, locale, t])

  const startPolling = useCallback(() => {
    const { spaceSeq, projectMap } = store.getState()
    if (!spaceSeq) return

    Object.values(pollTimers.current).forEach(clearTimeout)
    pollTimers.current = {}

    function scheduleNext(langCode: string, projectSeq: number, interval: number) {
      pollTimers.current[langCode] = setTimeout(async () => {
        try {
          const done = await pollLanguage(langCode, projectSeq, spaceSeq!, pollTimers.current, addToast)
          if (!done) {
            const next = Math.min(interval * POLL_BACKOFF, POLL_INTERVAL_MAX)
            scheduleNext(langCode, projectSeq, next)
          } else if (done === 'finalizing') {
            scheduleNext(langCode, projectSeq, POLL_FINALIZING)
          }
        } catch {
          scheduleNext(langCode, projectSeq, interval)
        }
      }, interval)
    }

    Object.entries(projectMap).forEach(([langCode, projectSeq]) => {
      scheduleNext(langCode, projectSeq, POLL_INTERVAL_MIN)
    })
  }, [addToast])

  const stopPolling = useCallback(() => {
    Object.values(pollTimers.current).forEach(clearTimeout)
    pollTimers.current = {}
  }, [])

  const cancelAll = useCallback(async () => {
    stopPolling()
    await cancelAllProjects(addToast, t({ ko: '더빙 작업을 취소했습니다', en: 'Dubbing job canceled' }))
  }, [stopPolling, addToast, t])

  const fetchDownloads = useCallback(async (langCode: string, target: DownloadTarget = 'all') => {
    const { spaceSeq, projectMap } = store.getState()
    const projectSeq = projectMap[langCode]
    if (!spaceSeq || !projectSeq) return null

    try {
      return await getDownloadLinks(projectSeq, spaceSeq, target)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t({ ko: '파일을 다운로드하지 못했습니다.', en: 'Download failed.' })
      addToast({ type: 'error', title: t({ ko: '다운로드 실패', en: 'Download failed' }), message: msg })
      return null
    }
  }, [addToast, t])

  return {
    uploadLocalVideo,
    importVideoByUrl,
    submitDubbing,
    startPolling,
    stopPolling,
    cancelAll,
    fetchDownloads,
  }
}
