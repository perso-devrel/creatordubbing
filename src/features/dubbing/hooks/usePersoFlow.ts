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
} from '@/lib/api-client'
import type { DownloadTarget } from '@/lib/perso/types'
import type { LanguageProgress } from '../types/dubbing.types'
import { dbMutation } from '@/lib/api/dbMutation'

const POLL_INTERVAL = 5000

function mapProgressReasonToStatus(reason: string) {
  switch (reason) {
    case 'PENDING':
    case 'CREATED':
      return 'transcribing' as const
    case 'READY':
    case 'READY_TARGET_LANGUAGES':
      return 'translating' as const
    case 'ENQUEUED':
      return 'synthesizing' as const
    case 'PROCESSING':
      return 'merging' as const
    case 'COMPLETED':
      return 'completed' as const
    case 'FAILED':
    case 'CANCELED':
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
): Promise<number | null> {
  const userId = useAuthStore.getState().user?.uid
  const videoMeta = store.getState().videoMeta
  const isShort = store.getState().isShort
  if (!userId) return null

  const result = await dbMutation<{ jobId: number }>({
    type: 'createDubbingJob',
    payload: {
      userId,
      videoTitle: videoMeta?.title || '',
      videoDurationMs: videoMeta?.durationMs || 0,
      videoThumbnail: videoMeta?.thumbnail || '',
      sourceLanguage: 'ko',
      mediaSeq,
      spaceSeq,
      lipSyncEnabled,
      isShort,
    },
  })
  if (!result?.jobId) return null

  store.getState().setDbJobId(result.jobId)
  await dbMutation({
    type: 'createJobLanguages',
    payload: {
      jobId: result.jobId,
      languages: selectedLanguages.map((code) => ({ code, projectSeq: projectMap[code] || 0 })),
    },
  })
  return result.jobId
}

async function pollLanguage(
  langCode: string,
  projectSeq: number,
  spaceSeq: number,
  pollTimers: Record<string, ReturnType<typeof setInterval>>,
  addToast: ReturnType<typeof useNotificationStore.getState>['addToast'],
) {
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
    })
  }

  const isTerminal = progress.progressReason === 'COMPLETED' || progress.progressReason === 'FAILED' || progress.progressReason === 'CANCELED'
  if (!isTerminal) return

  clearInterval(pollTimers[langCode])
  delete pollTimers[langCode]

  if (progress.progressReason === 'COMPLETED') {
    try {
      const downloads = await getDownloadLinks(projectSeq, spaceSeq, 'all')
      store.getState().updateLanguageProgress(langCode, {
        audioUrl: downloads.audioFile?.voiceAudioDownloadLink,
        srtUrl: downloads.srtFile?.translatedSubtitleDownloadLink,
        dubbingVideoUrl: downloads.videoFile?.videoDownloadLink,
      })
      if (dbJobId) {
        dbMutation({
          type: 'updateJobLanguageCompleted',
          payload: {
            jobId: dbJobId,
            langCode,
            urls: {
              dubbedVideoUrl: downloads.videoFile?.videoDownloadLink,
              audioUrl: downloads.audioFile?.voiceAudioDownloadLink,
              srtUrl: downloads.srtFile?.translatedSubtitleDownloadLink,
            },
          },
        })
      }
    } catch {
      // Download links will be fetched later if needed
    }
  }

  const allProgress = store.getState().languageProgress
  const allDone = allProgress.every(
    (lp) => lp.progressReason === 'COMPLETED' || lp.progressReason === 'FAILED' || lp.progressReason === 'CANCELED',
  )
  if (!allDone) return

  const anyFailed = allProgress.some((lp) => lp.progressReason === 'FAILED')
  store.getState().setJobStatus(anyFailed ? 'failed' : 'completed')
  if (dbJobId) {
    dbMutation({ type: 'updateJobStatus', payload: { jobId: dbJobId, status: anyFailed ? 'failed' : 'completed' } })
  }
  addToast({
    type: anyFailed ? 'warning' : 'success',
    title: anyFailed ? 'Dubbing completed with errors' : 'All dubbing complete!',
  })
}

export function usePersoFlow() {
  const addToast = useNotificationStore((s) => s.addToast)
  const pollTimers = useRef<Record<string, ReturnType<typeof setInterval>>>({})

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

    try {
      const meta = await getExternalMetadata(spaceSeq!, url, 'ko')
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

      const result = await uploadExternalVideo(spaceSeq!, url, 'ko')
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
    const { spaceSeq, mediaSeq, selectedLanguages, lipSyncEnabled } = store.getState()
    if (!spaceSeq || !mediaSeq) throw new Error('Missing space or media')

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
        sourceLanguageCode: 'ko',
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
        await saveJobToDb(mediaSeq, spaceSeq, selectedLanguages, projectMap, lipSyncEnabled)
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

    Object.values(pollTimers.current).forEach(clearInterval)
    pollTimers.current = {}

    Object.entries(projectMap).forEach(([langCode, projectSeq]) => {
      pollTimers.current[langCode] = setInterval(async () => {
        try {
          await pollLanguage(langCode, projectSeq, spaceSeq, pollTimers.current, addToast)
        } catch {
          // Network hiccup — retry on next interval
        }
      }, POLL_INTERVAL)
    })
  }, [addToast])

  const stopPolling = useCallback(() => {
    Object.values(pollTimers.current).forEach(clearInterval)
    pollTimers.current = {}
  }, [])

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
    fetchDownloads,
  }
}
