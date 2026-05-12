'use client'

import { useCallback, useRef } from 'react'
import { useDubbingStore } from '../store/dubbingStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useAuthStore } from '@/stores/authStore'
import { useAppLocale, useLocaleText } from '@/hooks/useLocaleText'

import type { AppLocale } from '@/lib/i18n/config'
import {
  getSpaces,
  uploadVideoFile as persoUploadVideoFile,
  getExternalMetadata,
  uploadExternalVideo,
  initializeQueue,
  submitTranslation,
  submitStt,
  submitLongStt,
  getLongSttCaptionStatus,
  generateSttCaptions,
  getProjectProgress,
  getDownloadLinks,
  getPersoFileUrl,
  cancelProject,
  cancelLongStt,
} from '@/lib/api-client'
import type { DownloadTarget } from '@/lib/perso/types'
import type { LanguageProgress } from '../types/dubbing.types'
import { dbMutation, dbMutationStrict } from '@/lib/api/dbMutation'
import { extractVideoId } from '@/utils/validators'
import {
  canUseSelectedOutputForVideo,
  isOverSinglePersoJobLimit,
  isLongVideoSttCaptionMode,
  isLongVideoUploadCaptionOutput,
} from '../utils/videoDurationLimits'

const POLL_INTERVAL_MIN = 8_000   // 첫 폴링: 8초
const POLL_INTERVAL_MAX = 30_000  // 최대 간격: 30초
const POLL_BACKOFF = 1.5          // 매 폴링마다 1.5배씩 증가
const POLL_FINALIZING = 2_000     // 100%인데 COMPLETED 아직 안 온 경우 빠르게 재확인
const DEFAULT_SOURCE_LANGUAGE = 'auto'
const DEFAULT_SPEAKER_COUNT = 1
type LocaleText = ReturnType<typeof useLocaleText>

function countLocaleMessage(locale: AppLocale, count: number, key: string, t: LocaleText): string {
  const unit = t(key)
  return locale === 'ko' ? `${count}${unit}` : `${count} ${unit}`
}

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
    case 'STT_CAPTION_TRANSLATING':
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

function isSttCaptionMode() {
  const state = store.getState()
  return state.deliverableMode === 'originalWithMultiAudio' &&
    state.uploadSettings.uploadCaptions &&
    state.uploadSettings.captionGenerationMode === 'stt'
}

function isLongSttCaptionMode() {
  const state = store.getState()
  return isSttCaptionMode() && isOverSinglePersoJobLimit(state.videoMeta)
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

async function pollSttCaptionJob(
  projectSeq: number,
  spaceSeq: number,
  pollTimers: Record<string, ReturnType<typeof setTimeout>>,
  addToast: ReturnType<typeof useNotificationStore.getState>['addToast'],
  t: LocaleText,
): Promise<boolean | 'finalizing'> {
  const progress = await getProjectProgress(projectSeq, spaceSeq)
  const dbJobId = store.getState().dbJobId
  const langCodes = store.getState().languageProgress.map((lp) => lp.langCode)
  const sttProgress = Math.min(70, Math.max(0, Math.round(progress.progress * 0.7)))
  const status = mapProgressReasonToStatus(progress.progressReason)

  for (const langCode of langCodes) {
    store.getState().updateLanguageProgress(langCode, {
      status,
      progress: sttProgress,
      progressReason: progress.progressReason,
    })
    if (dbJobId) {
      dbMutation({
        type: 'updateJobLanguageProgress',
        payload: {
          jobId: dbJobId,
          langCode,
          status,
          progress: sttProgress,
          progressReason: progress.progressReason,
        },
      }).catch(() => { /* progress update is best-effort */ })
    }
  }

  const reason = progress.progressReason
  const isTerminal = reason === 'COMPLETED' || reason === 'Completed' || reason === 'FAILED' || reason === 'Failed' || reason === 'CANCELED'
  if (!isTerminal) {
    if (progress.progress >= 100) return 'finalizing'
    return false
  }

  clearTimeout(pollTimers.stt)
  delete pollTimers.stt

  if (reason === 'COMPLETED' || reason === 'Completed') {
    for (const langCode of langCodes) {
      store.getState().updateLanguageProgress(langCode, {
        status: 'translating',
        progress: 72,
        progressReason: 'STT_CAPTION_TRANSLATING',
      })
      if (dbJobId) {
        dbMutation({
          type: 'updateJobLanguageProgress',
          payload: {
            jobId: dbJobId,
            langCode,
            status: 'translating',
            progress: 72,
            progressReason: 'STT_CAPTION_TRANSLATING',
          },
        }).catch(() => { /* progress update is best-effort */ })
      }
    }

    if (!dbJobId) throw new Error(t('features.dubbing.hooks.usePersoFlow.missingVideoInformationPleaseStartAgain'))

    try {
      const result = await generateSttCaptions({
        jobId: dbJobId,
        projectSeq,
        spaceSeq,
        targetLanguageCodes: langCodes,
        sourceLanguageCode: DEFAULT_SOURCE_LANGUAGE,
      })
      const byLang = new Map(result.languages.map((item) => [item.langCode, item]))
      const failedLangs = new Set((result.failedLanguages ?? []).map((item) => item.langCode))
      for (const langCode of langCodes) {
        const caption = byLang.get(langCode)
        if (failedLangs.has(langCode) || !caption) {
          store.getState().updateLanguageProgress(langCode, {
            status: 'failed',
            progressReason: 'FAILED',
          })
          continue
        }
        store.getState().updateLanguageProgress(langCode, {
          status: 'completed',
          progress: 100,
          progressReason: 'COMPLETED',
          srtUrl: caption.srtUrl,
        })
      }
    } catch (err) {
      for (const langCode of langCodes) {
        store.getState().updateLanguageProgress(langCode, {
          status: 'failed',
          progressReason: 'FAILED',
        })
        if (dbJobId) {
          dbMutation({
            type: 'updateJobLanguageProgress',
            payload: {
              jobId: dbJobId,
              langCode,
              status: 'failed',
              progress: 0,
              progressReason: 'FAILED',
            },
          }).catch(() => { /* failure update is best-effort */ })
        }
      }
      addToast({
        type: 'error',
        title: t('features.dubbing.hooks.usePersoFlow.captionGenerationFailed'),
        message: err instanceof Error ? err.message : '',
      })
    }
  }

  const allProgress = store.getState().languageProgress
  const anyFailed = allProgress.some((lp) => lp.progressReason === 'FAILED' || lp.progressReason === 'Failed' || lp.progressReason === 'CANCELED')
  const newStatus = anyFailed ? 'failed' : 'completed'
  const prevJobStatus = store.getState().jobStatus
  const alreadyFinalized = prevJobStatus === 'completed' || prevJobStatus === 'failed'
  store.getState().setJobStatus(newStatus)

  if (dbJobId && !alreadyFinalized) {
    await dbMutationStrict({ type: 'finalizeJobCredits', payload: { jobId: dbJobId } })
  }
  if (dbJobId) {
    await dbMutation({ type: 'updateJobStatus', payload: { jobId: dbJobId, status: newStatus } })
  }
  addToast({
    type: anyFailed ? 'warning' : 'success',
    title: anyFailed
      ? t('features.dubbing.hooks.usePersoFlow.captionGenerationFinishedWithSomeErrors')
      : t('features.dubbing.hooks.usePersoFlow.captionGenerationComplete'),
  })
  return true
}

async function cancelAllProjects(
  addToast: ReturnType<typeof useNotificationStore.getState>['addToast'],
  reason: string,
) {
  if (isLongSttCaptionMode()) {
    const dbJobId = store.getState().dbJobId
    if (dbJobId) {
      await cancelLongStt(dbJobId).catch(() => null)
      store.getState().setJobStatus('failed')
      addToast({ type: 'warning', title: reason })
      return
    }
  }

  const { spaceSeq, projectMap, languageProgress } = store.getState()
  if (!spaceSeq) return

  const activeLangs = languageProgress.filter(
    (lp) => lp.progressReason !== 'COMPLETED' && lp.progressReason !== 'Completed' &&
            lp.progressReason !== 'FAILED' && lp.progressReason !== 'Failed' &&
            lp.progressReason !== 'CANCELED',
  )

  const canceledProjects = new Set<number>()
  await Promise.allSettled(
    activeLangs.map(async (lp) => {
      const projectSeq = projectMap[lp.langCode]
      if (!projectSeq) return
      if (canceledProjects.has(projectSeq)) {
        store.getState().updateLanguageProgress(lp.langCode, {
          status: 'failed',
          progressReason: 'CANCELED',
        })
        return
      }
      canceledProjects.add(projectSeq)
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

    addToast({ type: 'info', title: t('features.dubbing.hooks.usePersoFlow.uploadingVideo'), message: file.name })

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
      addToast({
        type: 'success',
        title: t('features.dubbing.hooks.usePersoFlow.videoUploaded'),
        message: t('features.dubbing.hooks.usePersoFlow.valueIsReadyForDubbing', { fileName: file.name }),
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
    addToast({
      type: 'info',
      title: isYouTube
        ? t('features.dubbing.hooks.usePersoFlow.importingFromYouTube')
        : t('features.dubbing.hooks.usePersoFlow.importingVideoURL'),
      duration: 8000,
    })

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

      addToast({ type: 'success', title: t('features.dubbing.hooks.usePersoFlow.videoImported') })
      return result
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('features.dubbing.hooks.usePersoFlow.failedToImportVideo')
      addToast({ type: 'error', title: t('features.dubbing.hooks.usePersoFlow.importFailed'), message: msg })
      throw err
    }
  }, [initSpace, addToast, t])

  const submitDubbing = useCallback(async () => {
    const state = store.getState()
    const { spaceSeq, mediaSeq, selectedLanguages, lipSyncEnabled, videoMeta } = state
    if (!spaceSeq || !mediaSeq) {
      throw new Error(t('features.dubbing.hooks.usePersoFlow.missingVideoInformationPleaseStartAgain'))
    }
    const targetLanguages = Array.from(new Set(selectedLanguages))
    const sttCaptionMode = isSttCaptionMode()
    const outputAllowedForDuration = canUseSelectedOutputForVideo({
      videoMeta,
      videoSource: state.videoSource,
      deliverableMode: state.deliverableMode,
    })
    const longVideoModeReady = !isLongVideoUploadCaptionOutput({
      videoMeta,
      videoSource: state.videoSource,
      deliverableMode: state.deliverableMode,
    }) || isLongVideoSttCaptionMode({
      videoMeta,
      videoSource: state.videoSource,
      deliverableMode: state.deliverableMode,
      uploadSettings: state.uploadSettings,
    })
    if (!outputAllowedForDuration || !longVideoModeReady) {
      throw new Error(t('features.dubbing.hooks.usePersoFlow.longVideoUnsupported'))
    }

    addToast({
      type: 'info',
      title: t(sttCaptionMode
        ? 'features.dubbing.hooks.usePersoFlow.startingSttCaptionJob'
        : 'features.dubbing.hooks.usePersoFlow.startingDubbingJob'),
      message: countLocaleMessage(locale, targetLanguages.length, 'features.dubbing.hooks.usePersoFlow.unitLanguages', t),
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
        t,
      )
      await dbMutationStrict({ type: 'reserveJobCredits', payload: { jobId: dbJobId } })

      if (sttCaptionMode) {
        const isLongStt = isOverSinglePersoJobLimit(videoMeta)
        const projectSeq = isLongStt
          ? (await submitLongStt(dbJobId)).segments?.[0]?.projectSeq
          : (await submitStt(spaceSeq, {
              mediaSeq,
              isVideoProject: true,
              title: videoMeta?.title?.trim() || `Dubtube STT project ${mediaSeq}`,
            })).startGenerateProjectIdList?.[0]
        if (!isLongStt && !projectSeq) {
          throw new Error(t('features.dubbing.hooks.usePersoFlow.failedToStartDubbing'))
        }

        const projectMap = Object.fromEntries(targetLanguages.map((lang) => [lang, projectSeq ?? 0]))
        store.getState().setProjectMap(projectMap)
        const initialProgress: LanguageProgress[] = targetLanguages.map((code) => ({
          langCode: code,
          projectSeq: projectSeq ?? 0,
          status: 'transcribing',
          progress: 0,
          progressReason: isLongStt ? 'STT_SEGMENT_PREPARING' : 'PENDING',
        }))
        store.getState().setLanguageProgress(initialProgress)
        store.getState().setJobStatus('transcribing')

        if (!isLongStt) {
          await dbMutationStrict({
            type: 'updateJobLanguageProjects',
            payload: {
              jobId: dbJobId,
              languages: targetLanguages.map((code) => ({ code, projectSeq })),
            },
          })
        }

        addToast({
          type: 'success',
          title: t('features.dubbing.hooks.usePersoFlow.sttCaptionJobStarted'),
          message: countLocaleMessage(locale, targetLanguages.length, 'features.dubbing.hooks.usePersoFlow.unitLanguagesProcessing', t),
        })
        return projectMap
      }

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
        title: t('features.dubbing.hooks.usePersoFlow.dubbingStarted'),
        message: countLocaleMessage(locale, projectIds.length, 'features.dubbing.hooks.usePersoFlow.unitLanguagesProcessing', t),
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
  }, [addToast, locale, t])

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

    function scheduleStt(projectSeq: number, interval: number) {
      pollTimers.current.stt = setTimeout(async () => {
        try {
          const done = await pollSttCaptionJob(projectSeq, spaceSeq!, pollTimers.current, addToast, t)
          if (!done) {
            const next = Math.min(interval * POLL_BACKOFF, POLL_INTERVAL_MAX)
            scheduleStt(projectSeq, next)
          } else if (done === 'finalizing') {
            scheduleStt(projectSeq, POLL_FINALIZING)
          }
        } catch {
          scheduleStt(projectSeq, interval)
        }
      }, interval)
    }

    function scheduleLongStt(jobId: number, interval: number) {
      pollTimers.current.longStt = setTimeout(async () => {
        try {
          const result = await getLongSttCaptionStatus(jobId)
          for (const item of result.languages) {
            store.getState().updateLanguageProgress(item.langCode, {
              status: item.status === 'completed'
                ? 'completed'
                : item.status === 'failed'
                  ? 'failed'
                  : result.status === 'translating'
                    ? 'translating'
                    : 'transcribing',
              progress: item.progress,
              progressReason: item.progressReason,
              srtUrl: item.srtUrl,
            })
          }

          if (result.status === 'completed' || result.status === 'failed') {
            clearTimeout(pollTimers.current.longStt)
            delete pollTimers.current.longStt
            store.getState().setJobStatus(result.status)
            addToast({
              type: result.status === 'failed' ? 'warning' : 'success',
              title: result.status === 'failed'
                ? t('features.dubbing.hooks.usePersoFlow.captionGenerationFinishedWithSomeErrors')
                : t('features.dubbing.hooks.usePersoFlow.captionGenerationComplete'),
            })
            return
          }

          const next = Math.min(interval * POLL_BACKOFF, POLL_INTERVAL_MAX)
          scheduleLongStt(jobId, next)
        } catch {
          scheduleLongStt(jobId, interval)
        }
      }, interval)
    }

    if (isLongSttCaptionMode()) {
      const jobId = store.getState().dbJobId
      if (jobId) scheduleLongStt(jobId, POLL_INTERVAL_MIN)
      return
    }

    if (isSttCaptionMode()) {
      const projectSeq = Object.values(projectMap).find((value) => value > 0)
      if (projectSeq) scheduleStt(projectSeq, POLL_INTERVAL_MIN)
      return
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
