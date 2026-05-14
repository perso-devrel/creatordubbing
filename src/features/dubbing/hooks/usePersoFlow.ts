'use client'

import { useCallback, useRef } from 'react'
import { useDubbingStore } from '../store/dubbingStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useAuthStore } from '@/stores/authStore'
import { useLocaleText } from '@/hooks/useLocaleText'

import {
  getSpaces,
  getLanguages,
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
import type { DownloadTarget, PersoTtsModel } from '@/lib/perso/types'
import {
  BROADEST_TTS_MODEL,
  DEFAULT_TTS_MODEL,
  resolveTtsModelForTargetLanguages,
} from '@/lib/perso/tts-model'
import type { LanguageProgress } from '../types/dubbing.types'
import { dbMutation, dbMutationStrict } from '@/lib/api/dbMutation'
import { extractVideoId } from '@/utils/validators'

const POLL_INTERVAL_MIN = 8_000   // 첫 폴링: 8초
const POLL_INTERVAL_MAX = 30_000  // 최대 간격: 30초
const POLL_BACKOFF = 1.5          // 매 폴링마다 1.5배씩 증가
const POLL_FINALIZING = 2_000     // 100%인데 COMPLETED 아직 안 온 경우 빠르게 재확인
const DEFAULT_SOURCE_LANGUAGE = 'auto'
const DEFAULT_SPEAKER_COUNT = 1
type LocaleText = ReturnType<typeof useLocaleText>

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

async function resolveSubmitTtsModel(
  targetLanguages: string[],
  t: LocaleText,
): Promise<PersoTtsModel> {
  const unsupportedMessage = t('features.dubbing.hooks.usePersoFlow.unsupportedTtsModelPair')
  try {
    const languages = await getLanguages()
    const model = resolveTtsModelForTargetLanguages(
      languages,
      targetLanguages,
      DEFAULT_TTS_MODEL,
    )
    if (!model) {
      throw new Error(unsupportedMessage)
    }
    return model
  } catch (err) {
    if (err instanceof Error && err.message === unsupportedMessage) {
      throw err
    }
    console.warn('[Dubtube] TTS model compatibility lookup failed; using broadest model', err)
    return BROADEST_TTS_MODEL
  }
}

async function saveJobToDb(
  mediaSeq: number,
  spaceSeq: number,
  selectedLanguages: string[],
  projectMap: Record<string, number>,
  lipSyncEnabled: boolean,
  sourceLanguage: string,
  t: LocaleText,
): Promise<number> {
  const userId = useAuthStore.getState().user?.uid
  const videoMeta = store.getState().videoMeta
  const isShort = store.getState().isShort
  const state = store.getState()
  const originalYouTubeId =
    state.videoSource?.type === 'url' && state.videoSource.url
      ? extractVideoId(state.videoSource.url)
      : null
  if (!userId) {
    throw new Error(t('features.dubbing.hooks.usePersoFlow.pleaseSignInFirst'))
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
        deliverableMode: state.deliverableMode,
        uploadSettings: state.uploadSettings,
        originalVideoUrl: state.originalVideoUrl,
        originalYouTubeUrl: originalYouTubeId ? `https://www.youtube.com/watch?v=${originalYouTubeId}` : null,
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
  t: LocaleText,
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
  addToast({
    type: anyFailed ? 'warning' : 'success',
    title: anyFailed
      ? t('features.dubbing.hooks.usePersoFlow.dubbingFinishedWithSomeErrors')
      : t('features.dubbing.hooks.usePersoFlow.dubbingComplete'),
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
      throw new Error(t('features.dubbing.hooks.usePersoFlow.noWorkspaceWasFoundCheckYourAPISettings'))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('features.dubbing.hooks.usePersoFlow.failedToLoadWorkspace')
      addToast({ type: 'error', title: t('features.dubbing.hooks.usePersoFlow.workspaceError'), message: msg })
      throw err
    }
  }, [addToast, t])

  const uploadLocalVideo = useCallback(async (file: File) => {
    let spaceSeq = store.getState().spaceSeq
    if (!spaceSeq) spaceSeq = await initSpace()

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
        channelTitle: t('features.dubbing.hooks.usePersoFlow.uploadedFile'),
      })
      return result
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('features.dubbing.hooks.usePersoFlow.uploadFailed')
      addToast({ type: 'error', title: t('features.dubbing.hooks.usePersoFlow.uploadFailed2'), message: msg })
      throw err
    }
  }, [initSpace, addToast, t])

  const importVideoByUrl = useCallback(async (url: string) => {
    let spaceSeq = store.getState().spaceSeq
    if (!spaceSeq) spaceSeq = await initSpace()

    const isYouTube = /(?:youtube\.com|youtu\.be)/.test(url)

    try {
      const meta = await getExternalMetadata(spaceSeq!, url, DEFAULT_SOURCE_LANGUAGE)
      store.getState().setVideoMeta({
        id: url,
        title: meta.originalName || (isYouTube ? t('features.dubbing.hooks.usePersoFlow.youTubeVideo') : t('features.dubbing.hooks.usePersoFlow.externalVideo')),
        thumbnail: meta.thumbnailFilePath ? getPersoFileUrl(meta.thumbnailFilePath) : '',
        duration: Math.round(meta.durationMs / 1000),
        durationMs: meta.durationMs,
        channelTitle: isYouTube ? 'YouTube' : t('features.dubbing.hooks.usePersoFlow.externalLink'),
        width: meta.width,
        height: meta.height,
      })

      const result = await uploadExternalVideo(spaceSeq!, url, DEFAULT_SOURCE_LANGUAGE)
      store.getState().setMediaSeq(result.seq)
      if (result.videoFilePath) {
        store.getState().setOriginalVideoUrl(getPersoFileUrl(result.videoFilePath))
      }

      return result
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('features.dubbing.hooks.usePersoFlow.failedToImportVideo')
      addToast({ type: 'error', title: t('features.dubbing.hooks.usePersoFlow.importFailed'), message: msg })
      throw err
    }
  }, [initSpace, addToast, t])

  const submitDubbing = useCallback(async () => {
    const { spaceSeq, mediaSeq, selectedLanguages, lipSyncEnabled, videoMeta } = store.getState()
    if (!spaceSeq || !mediaSeq) {
      throw new Error(t('features.dubbing.hooks.usePersoFlow.missingVideoInformationPleaseStartAgain'))
    }
    const targetLanguages = Array.from(new Set(selectedLanguages))

    try {
      const ttsModel = await resolveSubmitTtsModel(targetLanguages, t)

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
        t,
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
        ttsModel,
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

      return projectMap
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('features.dubbing.hooks.usePersoFlow.failedToStartDubbing')
      addToast({ type: 'error', title: t('features.dubbing.hooks.usePersoFlow.dubbingFailed'), message: msg })
      const dbJobId = store.getState().dbJobId
      if (dbJobId) {
        dbMutation({ type: 'releaseJobCredits', payload: { jobId: dbJobId, reason: 'submission_failed' } }).catch(() => {})
        dbMutation({ type: 'updateJobStatus', payload: { jobId: dbJobId, status: 'failed' } }).catch(() => {})
      }
      store.getState().setJobStatus('failed')
      throw err
    }
  }, [addToast, t])

  const startPolling = useCallback(() => {
    const { spaceSeq, projectMap } = store.getState()
    if (!spaceSeq) return

    Object.values(pollTimers.current).forEach(clearTimeout)
    pollTimers.current = {}

    function scheduleNext(langCode: string, projectSeq: number, interval: number) {
      pollTimers.current[langCode] = setTimeout(async () => {
        try {
          const done = await pollLanguage(langCode, projectSeq, spaceSeq!, pollTimers.current, addToast, t)
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
  }, [addToast, t])

  const stopPolling = useCallback(() => {
    Object.values(pollTimers.current).forEach(clearTimeout)
    pollTimers.current = {}
  }, [])

  const cancelAll = useCallback(async () => {
    stopPolling()
    await cancelAllProjects(addToast, t('features.dubbing.hooks.usePersoFlow.dubbingJobCanceled'))
  }, [stopPolling, addToast, t])

  const fetchDownloads = useCallback(async (langCode: string, target: DownloadTarget = 'all') => {
    const { spaceSeq, projectMap } = store.getState()
    const projectSeq = projectMap[langCode]
    if (!spaceSeq || !projectSeq) return null

    try {
      return await getDownloadLinks(projectSeq, spaceSeq, target)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('features.dubbing.hooks.usePersoFlow.downloadFailed')
      addToast({ type: 'error', title: t('features.dubbing.hooks.usePersoFlow.downloadFailed2'), message: msg })
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
