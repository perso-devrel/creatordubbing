'use client'

/**
 * Hook that orchestrates the full Perso.ai dubbing workflow:
 * 1. Init space → 2. Upload video → 3. Submit translation → 4. Poll progress → 5. Get downloads
 */
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
  getProjectScript,
  getPersoFileUrl,
} from '@/lib/api-client'
import type { DownloadTarget, ScriptSentence } from '@/lib/perso/types'
import type { LanguageProgress } from '../types/dubbing.types'

const POLL_INTERVAL = 5000 // Perso recommends 5s

// ─── Internal: best-effort fetch to /api/dashboard/mutations ──────
type DbAction =
  | {
      type: 'createDubbingJob'
      payload: {
        userId: string
        videoTitle: string
        videoDurationMs: number
        videoThumbnail: string
        sourceLanguage: string
        mediaSeq: number
        spaceSeq: number
        lipSyncEnabled: boolean
        isShort: boolean
      }
    }
  | {
      type: 'createJobLanguages'
      payload: { jobId: number; languages: { code: string; projectSeq: number }[] }
    }
  | {
      type: 'updateJobLanguageProgress'
      payload: {
        jobId: number
        langCode: string
        status: string
        progress: number
        progressReason: string
      }
    }
  | {
      type: 'updateJobLanguageCompleted'
      payload: {
        jobId: number
        langCode: string
        urls: { dubbedVideoUrl?: string; audioUrl?: string; srtUrl?: string }
      }
    }
  | { type: 'updateJobStatus'; payload: { jobId: number; status: string } }

async function dbMutation<T = unknown>(action: DbAction): Promise<T | null> {
  try {
    const res = await fetch('/api/dashboard/mutations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action),
      cache: 'no-store',
    })
    const body = await res.json().catch(() => null)
    if (!body || !body.ok) return null
    return body.data as T
  } catch {
    return null
  }
}

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

export function usePersoFlow() {
  const store = useDubbingStore
  const addToast = useNotificationStore((s) => s.addToast)
  const pollTimers = useRef<Record<string, ReturnType<typeof setInterval>>>({})

  /** Step 0: Load space info (get spaceSeq) */
  const initSpace = useCallback(async () => {
    try {
      const spaces = await getSpaces()
      if (spaces.length > 0) {
        const space = spaces[0] // Use first space
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

  /** Step 1a: Upload local video file */
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

  /** Step 1b: Fetch YouTube video metadata and import */
  const importYouTubeVideo = useCallback(async (url: string) => {
    let spaceSeq = store.getState().spaceSeq
    if (!spaceSeq) spaceSeq = await initSpace()

    addToast({ type: 'info', title: 'Importing from YouTube...', duration: 8000 })

    try {
      // Get metadata first
      const meta = await getExternalMetadata(spaceSeq!, url, 'ko')
      store.getState().setVideoMeta({
        id: url,
        title: meta.originalName || 'YouTube Video',
        thumbnail: meta.thumbnailFilePath ? getPersoFileUrl(meta.thumbnailFilePath) : '',
        duration: Math.round(meta.durationMs / 1000),
        durationMs: meta.durationMs,
        channelTitle: 'YouTube',
        width: meta.width,
        height: meta.height,
      })

      // Import the video
      const result = await uploadExternalVideo(spaceSeq!, url, 'ko')
      store.getState().setMediaSeq(result.seq)

      addToast({ type: 'success', title: 'YouTube video imported' })
      return result
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'YouTube import failed'
      addToast({ type: 'error', title: 'Import Error', message: msg })
      throw err
    }
  }, [initSpace, addToast])

  /** Step 2: Submit translation job */
  const submitDubbing = useCallback(async () => {
    const { spaceSeq, mediaSeq, selectedLanguages, lipSyncEnabled } = store.getState()
    if (!spaceSeq || !mediaSeq) throw new Error('Missing space or media')

    addToast({ type: 'info', title: 'Submitting dubbing job...', message: `${selectedLanguages.length} languages` })

    try {
      // Initialize queue first (translate route also auto-inits — this is a safety net)
      try {
        await initializeQueue(spaceSeq)
      } catch {
        // Already initialized — ignore
      }

      // Submit translation — Perso creates one project per target language
      const result = await submitTranslation(spaceSeq, {
        mediaSeq,
        isVideoProject: true,
        sourceLanguageCode: 'ko', // test_video.mp4 is Korean
        targetLanguageCodes: selectedLanguages,
        numberOfSpeakers: 1,
        withLipSync: lipSyncEnabled,
        preferredSpeedType: 'GREEN',
      })

      // Map projectSeqs to language codes
      const projectIds = result.startGenerateProjectIdList || []
      const projectMap: Record<string, number> = {}
      selectedLanguages.forEach((lang, i) => {
        if (projectIds[i]) {
          projectMap[lang] = projectIds[i]
        }
      })
      store.getState().setProjectMap(projectMap)

      // Initialize language progress
      const initialProgress: LanguageProgress[] = selectedLanguages.map((code) => ({
        langCode: code,
        projectSeq: projectMap[code] || 0,
        status: 'transcribing',
        progress: 0,
        progressReason: 'PENDING',
      }))
      store.getState().setLanguageProgress(initialProgress)
      store.getState().setJobStatus('transcribing')

      // Save to DB (best-effort)
      try {
        const userId = useAuthStore.getState().user?.uid
        const videoMeta = store.getState().videoMeta
        const isShort = store.getState().isShort
        if (userId) {
          const createResult = await dbMutation<{ jobId: number }>({
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
          if (createResult?.jobId) {
            store.getState().setDbJobId(createResult.jobId)
            await dbMutation({
              type: 'createJobLanguages',
              payload: {
                jobId: createResult.jobId,
                languages: selectedLanguages.map((code) => ({ code, projectSeq: projectMap[code] || 0 })),
              },
            })
          }
        }
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

  /** Step 3: Start polling progress for all projects */
  const startPolling = useCallback(() => {
    const { spaceSeq, projectMap } = store.getState()
    if (!spaceSeq) return

    // Clear any existing timers
    Object.values(pollTimers.current).forEach(clearInterval)
    pollTimers.current = {}

    Object.entries(projectMap).forEach(([langCode, projectSeq]) => {
      pollTimers.current[langCode] = setInterval(async () => {
        try {
          const progress = await getProjectProgress(projectSeq, spaceSeq)

          const status = mapProgressReasonToStatus(progress.progressReason)
          store.getState().updateLanguageProgress(langCode, {
            status,
            progress: progress.progress,
            progressReason: progress.progressReason,
          })

          // DB progress update (best-effort)
          const dbJobId = store.getState().dbJobId
          if (dbJobId) {
            dbMutation({
              type: 'updateJobLanguageProgress',
              payload: {
                jobId: dbJobId,
                langCode,
                status,
                progress: progress.progress,
                progressReason: progress.progressReason,
              },
            })
          }

          // If completed or failed, stop polling this language
          if (progress.progressReason === 'COMPLETED' || progress.progressReason === 'FAILED' || progress.progressReason === 'CANCELED') {
            clearInterval(pollTimers.current[langCode])
            delete pollTimers.current[langCode]

            if (progress.progressReason === 'COMPLETED') {
              // Fetch download links
              try {
                const downloads = await getDownloadLinks(projectSeq, spaceSeq, 'all')
                store.getState().updateLanguageProgress(langCode, {
                  audioUrl: downloads.audioFile?.voiceAudioDownloadLink,
                  srtUrl: downloads.srtFile?.translatedSubtitleDownloadLink,
                  dubbingVideoUrl: downloads.videoFile?.videoDownloadLink,
                })
                // Save URLs to DB
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

            // Check if all languages are done
            const allProgress = store.getState().languageProgress
            const allDone = allProgress.every(
              (lp) => lp.progressReason === 'COMPLETED' || lp.progressReason === 'FAILED' || lp.progressReason === 'CANCELED',
            )
            if (allDone) {
              const anyFailed = allProgress.some((lp) => lp.progressReason === 'FAILED')
              store.getState().setJobStatus(anyFailed ? 'failed' : 'completed')
              // Update job status in DB
              if (dbJobId) {
                dbMutation({
                  type: 'updateJobStatus',
                  payload: { jobId: dbJobId, status: anyFailed ? 'failed' : 'completed' },
                })
              }
              addToast({
                type: anyFailed ? 'warning' : 'success',
                title: anyFailed ? 'Dubbing completed with errors' : 'All dubbing complete!',
              })
            }
          }
        } catch {
          // Network hiccup — just retry on next interval
        }
      }, POLL_INTERVAL)
    })
  }, [addToast])

  /** Stop all polling */
  const stopPolling = useCallback(() => {
    Object.values(pollTimers.current).forEach(clearInterval)
    pollTimers.current = {}
  }, [])

  /** Fetch download links for a specific project */
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

  /** Fetch script/sentences for a completed project */
  const fetchScript = useCallback(async (langCode: string): Promise<ScriptSentence[]> => {
    const { spaceSeq, projectMap } = store.getState()
    const projectSeq = projectMap[langCode]
    if (!spaceSeq || !projectSeq) return []

    try {
      return await getProjectScript(projectSeq, spaceSeq)
    } catch {
      return []
    }
  }, [])

  return {
    initSpace,
    uploadLocalVideo,
    importYouTubeVideo,
    submitDubbing,
    startPolling,
    stopPolling,
    fetchDownloads,
    fetchScript,
  }
}
