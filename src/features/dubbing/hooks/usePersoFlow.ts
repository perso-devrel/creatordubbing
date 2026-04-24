'use client'

import { useCallback, useRef } from 'react'
import { useDubbingStore } from '../store/dubbingStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useAuthStore } from '@/stores/authStore'
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
import { dbMutation } from '@/lib/api/dbMutation'

const POLL_INTERVAL_MIN = 8_000   // 첫 폴링: 8초
const POLL_INTERVAL_MAX = 30_000  // 최대 간격: 30초
const POLL_BACKOFF = 1.5          // 매 폴링마다 1.5배씩 증가
const POLL_FINALIZING = 2_000     // 100%인데 COMPLETED 아직 안 온 경우 빠르게 재확인
const AUTO_CANCEL_TIMEOUT = 15 * 60_000 // 15분 경과 시 자동 취소

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
): Promise<number | null> {
  const userId = useAuthStore.getState().user?.uid
  const videoMeta = store.getState().videoMeta
  const isShort = store.getState().isShort
  if (!userId) return null

  const result = await dbMutation<{ jobId: number }>({
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
  if (!result?.jobId) return null

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
      const toAbs = (u?: string) => (u ? (u.startsWith('http') ? u : getPersoFileUrl(u)) : undefined)
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
    const durationMs = store.getState().videoMeta?.durationMs || 0
    const minutesUsed = Math.max(1, Math.ceil(durationMs / 60_000))
    await dbMutation({ type: 'deductUserMinutes', payload: { userId, minutes: minutesUsed, jobId: dbJobId } })
  }
  if (dbJobId) {
    await dbMutation({ type: 'updateJobStatus', payload: { jobId: dbJobId, status: newStatus } })
  }
  addToast({
    type: anyFailed ? 'warning' : 'success',
    title: anyFailed ? 'Dubbing completed with errors' : 'All dubbing complete!',
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
    dbMutation({ type: 'updateJobStatus', payload: { jobId: dbJobId, status: 'failed' } }).catch(() => {})
  }
  store.getState().setJobStatus('failed')
  addToast({ type: 'warning', title: reason })
}

export function usePersoFlow() {
  const addToast = useNotificationStore((s) => s.addToast)
  const pollTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const timeoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const initSpace = useCallback(async () => {
    try {
      const spaces = await getSpaces()
      if (spaces.length > 0) {
        const space = spaces[0]
        store.getState().setSpaceSeq(space.spaceSeq)
        return space.spaceSeq
      }
      throw new Error('No spaces found. Check your API key.')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load spaces'
      addToast({ type: 'error', title: 'Space Error', message: msg })
      throw err
    }
  }, [addToast])

  const uploadLocalVideo = useCallback(async (file: File) => {
    let spaceSeq = store.getState().spaceSeq
    if (!spaceSeq) spaceSeq = await initSpace()

    addToast({ type: 'info', title: 'Uploading video...', message: file.name })

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
        channelTitle: 'Local file',
      })
      addToast({ type: 'success', title: 'Video uploaded', message: `${file.name} ready for dubbing` })
      return result
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      addToast({ type: 'error', title: 'Upload Error', message: msg })
      throw err
    }
  }, [initSpace, addToast])

  const importVideoByUrl = useCallback(async (url: string) => {
    let spaceSeq = store.getState().spaceSeq
    if (!spaceSeq) spaceSeq = await initSpace()

    const isYouTube = /(?:youtube\.com|youtu\.be)/.test(url)
    addToast({
      type: 'info',
      title: isYouTube ? 'YouTube에서 가져오는 중...' : '영상 URL 가져오는 중...',
      duration: 8000,
    })

    const sourceLanguage = store.getState().sourceLanguage
    try {
      const meta = await getExternalMetadata(spaceSeq!, url, sourceLanguage)
      store.getState().setVideoMeta({
        id: url,
        title: meta.originalName || (isYouTube ? 'YouTube Video' : 'External Video'),
        thumbnail: meta.thumbnailFilePath ? getPersoFileUrl(meta.thumbnailFilePath) : '',
        duration: Math.round(meta.durationMs / 1000),
        durationMs: meta.durationMs,
        channelTitle: isYouTube ? 'YouTube' : 'External',
        width: meta.width,
        height: meta.height,
      })

      const result = await uploadExternalVideo(spaceSeq!, url, sourceLanguage)
      store.getState().setMediaSeq(result.seq)

      addToast({ type: 'success', title: '영상 가져오기 완료' })
      return result
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '영상 가져오기 실패'
      addToast({ type: 'error', title: 'Import Error', message: msg })
      throw err
    }
  }, [initSpace, addToast])

  const submitDubbing = useCallback(async () => {
    const { spaceSeq, mediaSeq, selectedLanguages, lipSyncEnabled, sourceLanguage } = store.getState()
    if (!spaceSeq || !mediaSeq) throw new Error('Missing space or media')

    // Credit check before starting
    const currentUser = useAuthStore.getState().user
    if (currentUser) {
      const res = await fetch(`/api/dashboard/summary?uid=${currentUser.uid}`)
      const json = await res.json()
      if (json.ok) {
        const creditsRemaining = Number(json.data.credits_remaining) || 0
        const durationMs = store.getState().videoMeta?.durationMs || 0
        const estimatedMinutes = Math.max(1, Math.ceil(durationMs / 60_000))
        if (estimatedMinutes > creditsRemaining) {
          addToast({
            type: 'error',
            title: '크레딧 부족',
            message: `필요: ${estimatedMinutes}분, 잔여: ${creditsRemaining}분. 충전 후 다시 시도하세요.`,
          })
          throw new Error('Insufficient credits')
        }
      }
    }

    addToast({ type: 'info', title: 'Submitting dubbing job...', message: `${selectedLanguages.length} languages` })

    try {
      try {
        await initializeQueue(spaceSeq)
      } catch {
        // Already initialized
      }

      const result = await submitTranslation(spaceSeq, {
        mediaSeq,
        isVideoProject: true,
        sourceLanguageCode: sourceLanguage,
        targetLanguageCodes: selectedLanguages,
        numberOfSpeakers: 1,
        withLipSync: lipSyncEnabled,
        preferredSpeedType: 'GREEN',
      })

      const projectIds = result.startGenerateProjectIdList || []
      const projectMap: Record<string, number> = {}
      selectedLanguages.forEach((lang, i) => {
        if (projectIds[i]) {
          projectMap[lang] = projectIds[i]
        }
      })
      store.getState().setProjectMap(projectMap)

      const initialProgress: LanguageProgress[] = selectedLanguages.map((code) => ({
        langCode: code,
        projectSeq: projectMap[code] || 0,
        status: 'transcribing',
        progress: 0,
        progressReason: 'PENDING',
      }))
      store.getState().setLanguageProgress(initialProgress)
      store.getState().setJobStatus('transcribing')

      try {
        await saveJobToDb(mediaSeq, spaceSeq, selectedLanguages, projectMap, lipSyncEnabled, sourceLanguage)
      } catch {
        // DB save is best-effort
      }

      addToast({ type: 'success', title: '더빙 시작됨', message: `${projectIds.length}개 프로젝트 생성` })
      return projectMap
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Submission failed'
      addToast({ type: 'error', title: 'Dubbing Error', message: msg })
      store.getState().setJobStatus('failed')
      throw err
    }
  }, [addToast])

  const startPolling = useCallback(() => {
    const { spaceSeq, projectMap } = store.getState()
    if (!spaceSeq) return

    Object.values(pollTimers.current).forEach(clearTimeout)
    pollTimers.current = {}
    if (timeoutTimer.current) clearTimeout(timeoutTimer.current)

    timeoutTimer.current = setTimeout(() => {
      Object.values(pollTimers.current).forEach(clearTimeout)
      pollTimers.current = {}
      cancelAllProjects(addToast, '15분 초과 — 자동 취소됨')
    }, AUTO_CANCEL_TIMEOUT)

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
    if (timeoutTimer.current) {
      clearTimeout(timeoutTimer.current)
      timeoutTimer.current = null
    }
  }, [])

  const cancelAll = useCallback(async () => {
    stopPolling()
    await cancelAllProjects(addToast, '더빙이 취소되었습니다.')
  }, [stopPolling, addToast])

  const fetchDownloads = useCallback(async (langCode: string, target: DownloadTarget = 'all') => {
    const { spaceSeq, projectMap } = store.getState()
    const projectSeq = projectMap[langCode]
    if (!spaceSeq || !projectSeq) return null

    try {
      return await getDownloadLinks(projectSeq, spaceSeq, target)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Download failed'
      addToast({ type: 'error', title: 'Download Error', message: msg })
      return null
    }
  }, [addToast])

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
