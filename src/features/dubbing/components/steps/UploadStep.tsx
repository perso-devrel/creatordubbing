'use client'

import { Download, ExternalLink, Check, RotateCcw, Upload, Loader2, Volume2 } from 'lucide-react'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, CardTitle, Badge, Progress } from '@/components/ui'
import { getLanguageByCode } from '@/utils/languages'
import { extractVideoId } from '@/utils/validators'
import { useNotificationStore } from '@/stores/notificationStore'
import { useDubbingStore } from '../../store/dubbingStore'
import { usePersoFlow } from '../../hooks/usePersoFlow'
import { useAuthStore } from '@/stores/authStore'
import { ytUploadVideo, ytUploadCaption, getPersoFileUrl, getProjectScript } from '@/lib/api-client'
import { toBcp47 } from '@/utils/languages'
import { dbMutation } from '@/lib/api/dbMutation'
import { toSRT } from '@/utils/srt'
import { ScriptEditor } from '../ScriptEditor'
import { SubtitleEditor } from '../SubtitleEditor'
import { YouTubeExtensionUpload } from '../YouTubeExtensionUpload'

type UploadStatus = 'idle' | 'uploading' | 'done' | 'error'

interface LangUploadState {
  status: UploadStatus
  progress: number
  videoId?: string
  error?: string
}

export function UploadStep() {
  const {
    selectedLanguages, videoMeta, videoSource, languageProgress, dbJobId,
    spaceSeq, projectMap, uploadSettings, deliverableMode, originalVideoUrl, reset,
  } = useDubbingStore()
  const { fetchDownloads } = usePersoFlow()
  const addToast = useNotificationStore((s) => s.addToast)
  const userId = useAuthStore((s) => s.user?.uid)
  const router = useRouter()

  const originalYouTubeId =
    videoSource?.type === 'url' && videoSource.url ? extractVideoId(videoSource.url) : null
  const channelVideoId = videoSource?.type === 'channel' ? videoSource.videoId : null
  const originalYouTubeUrl = originalYouTubeId
    ? `https://www.youtube.com/watch?v=${originalYouTubeId}`
    : null

  const { autoUpload, uploadAsShort, attachOriginalLink, title: settingsTitle, description: settingsDescription, tags: settingsTags, privacyStatus } = uploadSettings

  const [loadingDownload, setLoadingDownload] = useState<string | null>(null)
  const [ytUploads, setYtUploads] = useState<Record<string, LangUploadState>>({})
  const [captionUploads, setCaptionUploads] = useState<Record<string, UploadStatus>>({})
  const [audioTrackEnabled, setAudioTrackEnabled] = useState(false)
  const [studioOpenedLang, setStudioOpenedLang] = useState<string | null>(null)
  const autoUploadTriggered = useRef(false)
  const autoChainTriggered = useRef(false)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  // Original video upload state (for upload + originalWithMultiAudio)
  const [originalUploadState, setOriginalUploadState] = useState<{
    status: 'idle' | 'uploading' | 'done' | 'skipped'
    videoId?: string
    error?: string
  }>({ status: videoSource?.type === 'channel' ? 'skipped' : 'idle' })

  // Resolve the target videoId for multi-audio
  const multiAudioVideoId =
    originalUploadState.videoId || channelVideoId || null

  const buildDescription = useCallback(
    (langName: string) => {
      const base = settingsDescription?.trim()
        ? settingsDescription
        : `${videoMeta?.title || 'Video'} - ${langName} 더빙 by Dubtube AI\n\n원본 영상에서 AI 보이스 클론으로 더빙되었습니다.`
      if (attachOriginalLink && originalYouTubeUrl) {
        return `${base}\n\n원본 영상: ${originalYouTubeUrl}`
      }
      return base
    },
    [settingsDescription, videoMeta?.title, attachOriginalLink, originalYouTubeUrl],
  )

  const handleNewDubbing = () => reset()
  const handleGoToDashboard = () => { reset(); router.push('/dashboard') }

  // ─── Original video upload (for upload + originalWithMultiAudio) ──────
  const uploadOriginalToYouTube = useCallback(async () => {
    if (!isAuthenticated || !originalVideoUrl) return null

    setOriginalUploadState({ status: 'uploading' })
    try {
      const result = await ytUploadVideo({
        videoUrl: originalVideoUrl,
        title: settingsTitle?.trim() || videoMeta?.title || 'Original Video',
        description: settingsDescription || '',
        tags: settingsTags,
        privacyStatus,
      })
      setOriginalUploadState({ status: 'done', videoId: result.videoId })
      addToast({
        type: 'success',
        title: '원본 영상 YouTube 업로드 완료',
        message: `영상 ID: ${result.videoId}`,
      })
      return result.videoId
    } catch (err) {
      const msg = err instanceof Error ? err.message : '원본 업로드 실패'
      setOriginalUploadState({ status: 'idle', error: msg })
      addToast({ type: 'error', title: '원본 영상 업로드 실패', message: msg })
      return null
    }
  }, [isAuthenticated, originalVideoUrl, settingsTitle, settingsDescription, settingsTags, privacyStatus, videoMeta?.title, addToast])

  // ─── Audio → Studio helper ──────────────────────────────────────────
  const handleAudioToStudio = useCallback(async (langCode: string, targetVideoId?: string) => {
    const lang = getLanguageByCode(langCode)
    if (!lang) return
    setStudioOpenedLang(langCode)
    try {
      const data = await fetchDownloads(langCode, 'voiceAudio')
      const rawAudioUrl = data?.audioFile?.voiceAudioDownloadLink
      const audioUrl = rawAudioUrl ? (rawAudioUrl.startsWith('http') ? rawAudioUrl : getPersoFileUrl(rawAudioUrl)) : undefined
      if (audioUrl) {
        const a = document.createElement('a')
        a.href = audioUrl
        a.download = `${lang.name}_${langCode}_audio.wav`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }

      try {
        await navigator.clipboard.writeText(langCode)
      } catch { /* ignore */ }

      const vid = targetVideoId || originalYouTubeId
      const studioUrl = vid
        ? `https://studio.youtube.com/video/${vid}/translations/audio`
        : 'https://studio.youtube.com'
      window.open(studioUrl, 'yt-studio', 'width=1400,height=900,noopener')

      addToast({
        type: 'info',
        title: `${lang.name} 오디오 준비 완료`,
        message: '오디오 다운로드 + Studio 팝업 열림. 언어 코드가 클립보드에 복사됐습니다.',
      })
    } finally {
      setTimeout(() => setStudioOpenedLang(null), 1500)
    }
  }, [fetchDownloads, originalYouTubeId, addToast])

  // ─── File download ──────────────────────────────────────────────────
  const handleDownload = useCallback(async (langCode: string, type: 'video' | 'voiceAudio' | 'translatedSubtitle') => {
    setLoadingDownload(`${langCode}-${type}`)
    try {
      const lang = getLanguageByCode(langCode)

      if (type === 'translatedSubtitle') {
        const pSeq = projectMap[langCode]
        if (!pSeq || !spaceSeq) return
        const data = await getProjectScript(pSeq, spaceSeq)
        const list = Array.isArray(data) ? data : []
        const srtContent = toSRT(list)
        const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${lang?.name || langCode}_${langCode}.srt`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        return
      }

      const target = type === 'video' ? 'dubbingVideo' : 'voiceAudio'
      const data = await fetchDownloads(langCode, target as 'all')
      if (!data) return

      let rawUrl: string | undefined
      if (type === 'video' && data.videoFile?.videoDownloadLink) rawUrl = data.videoFile.videoDownloadLink
      else if (type === 'voiceAudio' && data.audioFile?.voiceAudioDownloadLink) rawUrl = data.audioFile.voiceAudioDownloadLink
      else if (data.zippedFileDownloadLink) rawUrl = data.zippedFileDownloadLink

      if (rawUrl) {
        const fullUrl = rawUrl.startsWith('http') ? rawUrl : getPersoFileUrl(rawUrl)
        const ext = type === 'video' ? 'mp4' : 'wav'
        const a = document.createElement('a')
        a.href = fullUrl
        a.download = `${lang?.name || langCode}_${langCode}.${ext}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
    } finally {
      setLoadingDownload(null)
    }
  }, [fetchDownloads, projectMap, spaceSeq])

  // ─── Upload dubbed video to YouTube (newDubbedVideos mode) ──────────
  const handleYouTubeUpload = useCallback(async (langCode: string) => {
    if (!isAuthenticated) {
      addToast({ type: 'error', title: 'YouTube에 먼저 로그인해주세요' })
      return
    }

    const lang = getLanguageByCode(langCode)
    if (!lang) return

    setYtUploads((prev) => ({ ...prev, [langCode]: { status: 'uploading', progress: 0 } }))

    try {
      const downloads = await fetchDownloads(langCode, 'dubbingVideo')
      const rawVideoUrl = downloads?.videoFile?.videoDownloadLink
      if (!rawVideoUrl) throw new Error('더빙 영상 다운로드 링크를 찾을 수 없습니다')
      const videoUrl = rawVideoUrl.startsWith('http') ? rawVideoUrl : getPersoFileUrl(rawVideoUrl)

      setYtUploads((prev) => ({ ...prev, [langCode]: { status: 'uploading', progress: 20 } }))
      const titlePrefix = uploadAsShort ? '#Shorts ' : ''
      const baseTitle = settingsTitle?.trim() || videoMeta?.title || 'Dubbed Video'
      const ytTitle = `${titlePrefix}[${lang.name}] ${baseTitle}`
      const langTags = Array.from(new Set([
        ...settingsTags,
        lang.name,
        ...(uploadAsShort ? ['Shorts'] : []),
      ]))
      const result = await ytUploadVideo({
        videoUrl,
        title: ytTitle,
        description: buildDescription(lang.name),
        tags: langTags,
        privacyStatus,
        language: langCode,
      })
      setYtUploads((prev) => ({ ...prev, [langCode]: { status: 'uploading', progress: 90 } }))

      // Upload SRT caption from Script API
      setYtUploads((prev) => ({ ...prev, [langCode]: { status: 'uploading', progress: 92 } }))
      try {
        const pSeq = projectMap[langCode]
        if (pSeq && spaceSeq) {
          const scriptData = await getProjectScript(pSeq, spaceSeq)
          const scriptList = Array.isArray(scriptData) ? scriptData : []
          if (scriptList.length > 0) {
            const srtText = toSRT(scriptList)
            await ytUploadCaption({
              videoId: result.videoId,
              language: toBcp47(langCode),
              name: `${lang.name} subtitles`,
              srtContent: srtText,
            })
          }
        }
      } catch { /* caption upload is optional */ }

      setYtUploads((prev) => ({
        ...prev,
        [langCode]: { status: 'done', progress: 100, videoId: result.videoId },
      }))

      try {
        if (userId) {
          await dbMutation({
            type: 'createYouTubeUpload',
            payload: {
              userId,
              youtubeVideoId: result.videoId,
              title: ytTitle,
              languageCode: langCode,
              privacyStatus,
              isShort: uploadAsShort,
            },
          })
          if (dbJobId) {
            await dbMutation({
              type: 'updateJobLanguageYouTube',
              payload: { jobId: dbJobId, langCode, youtubeVideoId: result.videoId },
            })
          }
        }
      } catch { /* DB save best-effort */ }

      const privacyLabel = privacyStatus === 'public' ? '공개' : privacyStatus === 'unlisted' ? '일부 공개' : '비공개'
      addToast({
        type: 'success',
        title: `${lang.name} YouTube 업로드 완료`,
        message: `영상 ID: ${result.videoId} (${privacyLabel})`,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : '업로드 실패'
      setYtUploads((prev) => ({
        ...prev,
        [langCode]: { status: 'error', progress: 0, error: msg },
      }))
      addToast({ type: 'error', title: `${lang?.name} 업로드 실패`, message: msg })
    }
  }, [fetchDownloads, videoMeta, addToast, userId, dbJobId, uploadAsShort, isAuthenticated, settingsTitle, settingsTags, privacyStatus, buildDescription, projectMap, spaceSeq])

  // ─── Queue upload (background — survives tab close) ─────────────────
  const queueYouTubeUpload = useCallback(async (langCode: string) => {
    if (!userId || !dbJobId) return

    const lang = getLanguageByCode(langCode)
    if (!lang) return

    setYtUploads((prev) => ({ ...prev, [langCode]: { status: 'uploading', progress: 10 } }))

    try {
      const downloads = await fetchDownloads(langCode, 'dubbingVideo')
      const rawVideoUrl = downloads?.videoFile?.videoDownloadLink
      if (!rawVideoUrl) throw new Error('더빙 영상 다운로드 링크를 찾을 수 없습니다')
      const videoUrl = rawVideoUrl.startsWith('http') ? rawVideoUrl : getPersoFileUrl(rawVideoUrl)

      const titlePrefix = uploadAsShort ? '#Shorts ' : ''
      const baseTitle = settingsTitle?.trim() || videoMeta?.title || 'Dubbed Video'
      const ytTitle = `${titlePrefix}[${lang.name}] ${baseTitle}`
      const langTags = Array.from(new Set([
        ...settingsTags,
        lang.name,
        ...(uploadAsShort ? ['Shorts'] : []),
      ]))

      await dbMutation({
        type: 'queueYouTubeUpload',
        payload: {
          userId,
          jobId: dbJobId,
          langCode,
          videoUrl,
          title: ytTitle,
          description: buildDescription(lang.name),
          tags: langTags,
          privacyStatus,
          language: langCode,
          isShort: uploadAsShort,
        },
      })

      setYtUploads((prev) => ({
        ...prev,
        [langCode]: { status: 'done', progress: 100 },
      }))
      addToast({
        type: 'success',
        title: `${lang.name} 업로드 예약됨`,
        message: '서버에서 백그라운드로 업로드합니다. 탭을 닫아도 됩니다.',
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : '큐 등록 실패'
      setYtUploads((prev) => ({
        ...prev,
        [langCode]: { status: 'error', progress: 0, error: msg },
      }))
      addToast({ type: 'error', title: `${lang?.name} 큐 등록 실패`, message: msg })
    }
  }, [fetchDownloads, videoMeta, addToast, userId, dbJobId, uploadAsShort, settingsTitle, settingsTags, privacyStatus, buildDescription])

  const completedLangs = selectedLanguages.filter((code) => {
    const lp = languageProgress.find((p) => p.langCode === code)
    return lp?.progressReason === 'COMPLETED' || lp?.progressReason === 'Completed'
  })

  const failedLangs = selectedLanguages.filter((code) => {
    const lp = languageProgress.find((p) => p.langCode === code)
    return lp?.progressReason === 'FAILED' || lp?.progressReason === 'Failed' || lp?.progressReason === 'CANCELED'
  })

  const anyUploading = Object.values(ytUploads).some((s) => s.status === 'uploading')

  const handleUploadAll = useCallback(async () => {
    const pending = completedLangs.filter((code) => ytUploads[code]?.status !== 'done')
    const CONCURRENCY = 2
    for (let i = 0; i < pending.length; i += CONCURRENCY) {
      const batch = pending.slice(i, i + CONCURRENCY)
      await Promise.all(batch.map((code) => handleYouTubeUpload(code)))
    }
  }, [completedLangs, ytUploads, handleYouTubeUpload])

  const handleQueueAll = useCallback(async () => {
    const pending = completedLangs.filter((code) => ytUploads[code]?.status !== 'done')
    for (const code of pending) {
      await queueYouTubeUpload(code)
    }
  }, [completedLangs, ytUploads, queueYouTubeUpload])

  // ─── Caption upload to YouTube ───────────────────────────────────────
  const uploadCaptions = useCallback(async (targetVideoId: string, langs: string[]) => {
    for (const langCode of langs) {
      const lang = getLanguageByCode(langCode)
      if (!lang) continue
      const pSeq = projectMap[langCode]
      if (!pSeq || !spaceSeq) continue

      setCaptionUploads((prev) => ({ ...prev, [langCode]: 'uploading' }))
      try {
        const data = await getProjectScript(pSeq, spaceSeq)
        const list = Array.isArray(data) ? data : []
        if (list.length === 0) {
          setCaptionUploads((prev) => ({ ...prev, [langCode]: 'error' }))
          continue
        }
        const srtContent = toSRT(list)
        await ytUploadCaption({
          videoId: targetVideoId,
          language: toBcp47(langCode),
          name: `${lang.name} subtitles`,
          srtContent,
        })
        setCaptionUploads((prev) => ({ ...prev, [langCode]: 'done' }))
        addToast({ type: 'success', title: `${lang.name} 자막 업로드 완료` })
      } catch (err) {
        setCaptionUploads((prev) => ({ ...prev, [langCode]: 'error' }))
        const msg = err instanceof Error ? err.message : '자막 업로드 실패'
        addToast({ type: 'error', title: `${lang.name} 자막 업로드 실패`, message: msg })
      }
    }
  }, [projectMap, spaceSeq, addToast])

  const handleUploadCaptionsToVideo = useCallback(async (targetVideoId: string) => {
    const pending = completedLangs.filter((code) => captionUploads[code] !== 'done')
    await uploadCaptions(targetVideoId, pending)
  }, [completedLangs, captionUploads, uploadCaptions])

  // ─── Auto-chain: originalWithMultiAudio ──────────────────────────────
  // 1. Upload original (if file upload) → 2. Auto-upload captions → 3. Extension for audio tracks
  useEffect(() => {
    if (deliverableMode !== 'originalWithMultiAudio') return
    if (!autoUpload || !isAuthenticated) return
    if (completedLangs.length === 0) return
    if (autoChainTriggered.current) return
    autoChainTriggered.current = true

    const chain = async () => {
      let targetVideoId: string | undefined | null

      if (videoSource?.type === 'channel' && channelVideoId) {
        targetVideoId = channelVideoId
      } else if (videoSource?.type === 'upload' && originalVideoUrl) {
        targetVideoId = await uploadOriginalToYouTube()
      }

      if (targetVideoId) {
        await uploadCaptions(targetVideoId, completedLangs)
      }
    }

    chain()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliverableMode, autoUpload, isAuthenticated, completedLangs.length])

  // ─── Auto-upload: newDubbedVideos ────────────────────────────────────
  useEffect(() => {
    if (deliverableMode !== 'newDubbedVideos') return
    if (autoUpload && isAuthenticated && completedLangs.length > 0 && !autoUploadTriggered.current && !anyUploading) {
      autoUploadTriggered.current = true
      handleUploadAll()
    }
  }, [deliverableMode, autoUpload, isAuthenticated, completedLangs.length, anyUploading, handleUploadAll])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/20">
          <Check className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-surface-900 dark:text-white">
          {failedLangs.length > 0 ? '더빙 부분 완료' : '더빙된 영상이 준비되었습니다!'}
        </h2>
        <p className="mt-1 text-surface-500">
          {completedLangs.length} / {selectedLanguages.length}개 언어 완료.
          {deliverableMode === 'downloadOnly'
            ? ' 파일을 다운로드하세요.'
            : deliverableMode === 'originalWithMultiAudio'
              ? ' 원본 영상에 오디오 트랙을 추가합니다.'
              : ' 다운로드하거나 YouTube에 업로드하세요.'}
        </p>
      </div>

      {/* ─── originalWithMultiAudio: Original upload + extension auto ─── */}
      {deliverableMode === 'originalWithMultiAudio' && completedLangs.length > 0 && (
        <>
          {/* Original upload status (file upload only) */}
          {videoSource?.type === 'upload' && (
            <Card>
              <CardTitle>원본 영상 YouTube 업로드</CardTitle>
              <div className="mt-3">
                {originalUploadState.status === 'idle' && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-surface-500">
                      원본 영상을 YouTube에 업로드해야 오디오 트랙을 추가할 수 있습니다.
                    </p>
                    <Button
                      size="sm"
                      onClick={uploadOriginalToYouTube}
                      disabled={!isAuthenticated}
                    >
                      <Upload className="h-4 w-4" />
                      원본 업로드
                    </Button>
                  </div>
                )}
                {originalUploadState.status === 'uploading' && (
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
                    <p className="text-sm text-surface-600 dark:text-surface-400">원본 영상 업로드 중...</p>
                  </div>
                )}
                {originalUploadState.status === 'done' && originalUploadState.videoId && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-emerald-500" />
                      <p className="text-sm text-emerald-700 dark:text-emerald-400">
                        업로드 완료 — <a
                          href={`https://youtube.com/watch?v=${originalUploadState.videoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >영상 보기</a>
                      </p>
                    </div>
                    <Badge variant="success">완료</Badge>
                  </div>
                )}
                {originalUploadState.error && (
                  <p className="text-xs text-red-500 mt-1">{originalUploadState.error}</p>
                )}
              </div>
            </Card>
          )}

          {/* Channel source — already on YouTube */}
          {videoSource?.type === 'channel' && channelVideoId && (
            <Card>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-emerald-500" />
                <p className="text-sm text-surface-700 dark:text-surface-300">
                  기존 YouTube 영상에 오디오 트랙을 추가합니다.
                </p>
                <a
                  href={`https://youtube.com/watch?v=${channelVideoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand-500 underline"
                >
                  영상 보기
                </a>
              </div>
            </Card>
          )}

          {/* Caption auto-upload */}
          {multiAudioVideoId && (
            <Card className="border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center justify-between mb-4">
                <CardTitle>자막(SRT) 업로드</CardTitle>
                {isAuthenticated ? (
                  <Badge variant="success">인증됨</Badge>
                ) : (
                  <Badge variant="warning">로그인 필요</Badge>
                )}
              </div>
              <p className="mb-4 text-sm text-surface-500">
                번역된 자막을 원본 영상에 자동으로 업로드합니다.
              </p>
              <div className="space-y-2">
                {completedLangs.map((code) => {
                  const lang = getLanguageByCode(code)
                  if (!lang) return null
                  const status = captionUploads[code]
                  return (
                    <div key={code} className="flex items-center justify-between rounded-lg border border-surface-200 p-3 dark:border-surface-800">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-lg">{lang.flag}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-surface-900 dark:text-white">{lang.name}</p>
                          {status === 'uploading' && <p className="text-xs text-brand-500">업로드 중...</p>}
                          {status === 'done' && <p className="text-xs text-emerald-600">자막 업로드 완료</p>}
                          {status === 'error' && <p className="text-xs text-red-500">업로드 실패</p>}
                        </div>
                      </div>
                      {status === 'done' ? (
                        <Badge variant="success">완료</Badge>
                      ) : status === 'uploading' ? (
                        <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => uploadCaptions(multiAudioVideoId, [code])}
                          disabled={!isAuthenticated}
                        >
                          <Upload className="h-3.5 w-3.5" />
                          {status === 'error' ? '재시도' : '업로드'}
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
              {completedLangs.length > 1 && (
                <Button
                  className="mt-3 w-full"
                  variant="secondary"
                  onClick={() => handleUploadCaptionsToVideo(multiAudioVideoId)}
                  disabled={!isAuthenticated || completedLangs.every((c) => captionUploads[c] === 'done')}
                >
                  <Upload className="h-4 w-4" />
                  전체 자막 업로드
                </Button>
              )}
            </Card>
          )}

          {/* Audio track toggle + extension upload */}
          {multiAudioVideoId && (
            <Card className="border-surface-200 dark:border-surface-700">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>멀티 오디오 트랙 추가</CardTitle>
                  <p className="mt-1 text-xs text-surface-500">
                    더빙된 오디오를 원본 영상에 멀티 트랙으로 추가합니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAudioTrackEnabled((v) => !v)}
                  className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all cursor-pointer ${
                    audioTrackEnabled
                      ? 'bg-brand-500 text-white'
                      : 'bg-surface-200 text-surface-600 dark:bg-surface-700 dark:text-surface-400'
                  }`}
                >
                  {audioTrackEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {!audioTrackEnabled && (
                <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
                  YouTube 멀티 오디오 트랙 기능 허가가 필요합니다. 허가 후 ON으로 전환하세요.
                </p>
              )}

              {audioTrackEnabled && (
                <div className="mt-4 space-y-4">
                  <YouTubeExtensionUpload
                    videoId={multiAudioVideoId}
                    completedLangs={completedLangs}
                    autoTrigger={autoUpload}
                    getAudioUrl={async (langCode) => {
                      const data = await fetchDownloads(langCode, 'voiceAudio')
                      const raw = data?.audioFile?.voiceAudioDownloadLink
                      return raw ? (raw.startsWith('http') ? raw : getPersoFileUrl(raw)) : undefined
                    }}
                  />

                  <div className="border-t border-surface-200 pt-4 dark:border-surface-700">
                    <p className="text-xs text-surface-500 mb-3">
                      확장 프로그램 없이 수동으로 진행하려면 아래 버튼을 사용하세요.
                    </p>
                    <div className="space-y-2">
                      {completedLangs.map((code) => {
                        const lang = getLanguageByCode(code)
                        if (!lang) return null
                        const opening = studioOpenedLang === code
                        return (
                          <div key={code} className="flex items-center justify-between rounded-lg border border-surface-200 p-3 dark:border-surface-800">
                            <div className="flex items-center gap-3">
                              <span className="text-lg">{lang.flag}</span>
                              <p className="text-sm font-medium text-surface-900 dark:text-white">{lang.name}</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => handleAudioToStudio(code, multiAudioVideoId)} loading={opening}>
                              <Volume2 className="h-3.5 w-3.5" />
                              오디오 + Studio
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}
        </>
      )}

      {/* ─── Audio preview for manual mode ─── */}
      {!autoUpload && completedLangs.length > 0 && (
        <Card>
          <CardTitle>오디오 미리듣기</CardTitle>
          <p className="mb-4 mt-1 text-xs text-surface-500">
            업로드 전에 더빙된 오디오를 확인하세요.
          </p>
          <div className="space-y-3">
            {completedLangs.map((code) => {
              const lang = getLanguageByCode(code)
              const lp = languageProgress.find((p) => p.langCode === code)
              if (!lang || !lp?.audioUrl) return null
              return (
                <div key={code} className="flex items-center gap-3 rounded-lg border border-surface-200 p-3 dark:border-surface-800">
                  <span className="text-lg">{lang.flag}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-900 dark:text-white mb-1">{lang.name}</p>
                    <audio controls preload="none" className="w-full h-8" src={lp.audioUrl}>
                      <track kind="captions" />
                    </audio>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* ─── newDubbedVideos: YouTube Auto Upload ─── */}
      {deliverableMode === 'newDubbedVideos' && (
        <Card className="border-brand-200 dark:border-brand-800">
          <div className="flex items-center justify-between mb-4">
            <CardTitle>YouTube 업로드</CardTitle>
            {isAuthenticated ? (
              <Badge variant="success">인증됨</Badge>
            ) : (
              <Badge variant="warning">Google 로그인 시 자동 인증</Badge>
            )}
          </div>

          {isAuthenticated ? (
            <>
              <p className="text-sm text-surface-500 mb-4">
                더빙된 영상을 YouTube에 새 영상으로 업로드합니다.
              </p>

              <div className="mb-4 rounded-lg bg-surface-50 p-3 dark:bg-surface-800/50 text-xs text-surface-500 space-y-1">
                <p>
                  자동 업로드: <span className="font-medium text-surface-700 dark:text-surface-300">{autoUpload ? 'ON' : 'OFF'}</span>
                  {' · '}
                  Shorts: <span className="font-medium text-surface-700 dark:text-surface-300">{uploadAsShort ? 'ON' : 'OFF'}</span>
                  {' · '}
                  공개: <span className="font-medium text-surface-700 dark:text-surface-300">{privacyStatus === 'public' ? '공개' : privacyStatus === 'unlisted' ? '일부 공개' : '비공개'}</span>
                </p>
                {attachOriginalLink && originalYouTubeUrl && (
                  <p className="truncate">원본 링크 첨부: {originalYouTubeUrl}</p>
                )}
              </div>

              <div className="space-y-2">
                {completedLangs.map((code) => {
                  const lang = getLanguageByCode(code)
                  if (!lang) return null
                  const state = ytUploads[code]

                  return (
                    <div
                      key={code}
                      className="flex items-center justify-between rounded-lg border border-surface-200 p-3 dark:border-surface-800"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-lg">{lang.flag}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-surface-900 dark:text-white">{lang.name}</p>
                          {state?.status === 'uploading' && (
                            <Progress value={state.progress} size="sm" className="mt-1 w-32" />
                          )}
                          {state?.status === 'done' && state.videoId && (
                            <p className="text-xs text-emerald-600">
                              업로드 완료 — <a
                                href={`https://youtube.com/watch?v=${state.videoId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline"
                              >영상 보기</a>
                            </p>
                          )}
                          {state?.status === 'error' && (
                            <p className="text-xs text-red-500">{state.error}</p>
                          )}
                        </div>
                      </div>

                      {state?.status === 'done' ? (
                        <Badge variant="success">완료</Badge>
                      ) : state?.status === 'uploading' ? (
                        <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
                      ) : (
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleYouTubeUpload(code)}
                            disabled={anyUploading}
                          >
                            <Upload className="h-3.5 w-3.5" />
                            즉시
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => queueYouTubeUpload(code)}
                            disabled={anyUploading}
                          >
                            예약
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {completedLangs.length > 1 && (
                <div className="mt-3 flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={handleUploadAll}
                    disabled={anyUploading}
                    loading={anyUploading}
                  >
                    <Upload className="h-4 w-4" />
                    즉시 업로드
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={handleQueueAll}
                    disabled={anyUploading}
                  >
                    <Upload className="h-4 w-4" />
                    예약 (탭 닫아도 OK)
                  </Button>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-surface-500">
              YouTube에 로그인하면 더빙된 영상을 자동으로 채널에 업로드할 수 있습니다.
            </p>
          )}
        </Card>
      )}

      {/* ─── Caption upload to original video (URL source) ─── */}
      {deliverableMode === 'newDubbedVideos' && originalYouTubeId && completedLangs.length > 0 && isAuthenticated && (
        <Card>
          <CardTitle>원본 영상에 자막 추가</CardTitle>
          <p className="mb-4 mt-1 text-sm text-surface-500">
            번역된 자막(SRT)을 원본 YouTube 영상에 업로드합니다.
          </p>
          <div className="space-y-2">
            {completedLangs.map((code) => {
              const lang = getLanguageByCode(code)
              if (!lang) return null
              const status = captionUploads[code]
              return (
                <div key={code} className="flex items-center justify-between rounded-lg border border-surface-200 p-3 dark:border-surface-800">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{lang.flag}</span>
                    <div>
                      <p className="text-sm font-medium text-surface-900 dark:text-white">{lang.name}</p>
                      {status === 'done' && <p className="text-xs text-emerald-600">자막 업로드 완료</p>}
                      {status === 'error' && <p className="text-xs text-red-500">업로드 실패</p>}
                    </div>
                  </div>
                  {status === 'done' ? (
                    <Badge variant="success">완료</Badge>
                  ) : status === 'uploading' ? (
                    <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => uploadCaptions(originalYouTubeId, [code])}>
                      <Upload className="h-3.5 w-3.5" />
                      자막 업로드
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* ─── Download section ─── */}
      {completedLangs.length > 0 && (
        <Card>
          <CardTitle>더빙 파일 다운로드</CardTitle>
          <div className="mt-4 space-y-2">
            {completedLangs.map((code) => {
              const lang = getLanguageByCode(code)
              if (!lang) return null

              return (
                <div
                  key={code}
                  className="flex items-center justify-between rounded-lg border border-surface-200 p-3 dark:border-surface-800"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{lang.flag}</span>
                    <div>
                      <p className="text-sm font-medium text-surface-900 dark:text-white">{lang.name}</p>
                      <p className="text-xs text-surface-400">
                        {deliverableMode === 'originalWithMultiAudio' ? 'Audio + SRT' : 'Video + Audio + SRT'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {deliverableMode !== 'originalWithMultiAudio' && (
                      <Button variant="outline" size="sm" onClick={() => handleDownload(code, 'video')}
                        loading={loadingDownload === `${code}-video`}>
                        <Download className="h-3.5 w-3.5" /> Video
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => handleDownload(code, 'voiceAudio')}
                      loading={loadingDownload === `${code}-voiceAudio`}>
                      <Download className="h-3.5 w-3.5" /> Audio
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDownload(code, 'translatedSubtitle')}
                      loading={loadingDownload === `${code}-translatedSubtitle`}>
                      <Download className="h-3.5 w-3.5" /> SRT
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* ─── Failed languages ─── */}
      {failedLangs.length > 0 && (
        <Card className="border-red-200 dark:border-red-800">
          <CardTitle>실패한 언어</CardTitle>
          <div className="mt-2 flex flex-wrap gap-2">
            {failedLangs.map((code) => {
              const lang = getLanguageByCode(code)
              return lang ? <Badge key={code} variant="error">{lang.flag} {lang.name}</Badge> : null
            })}
          </div>
          <p className="mt-2 text-xs text-surface-500">
            이 언어들은 처리에 실패했습니다. 새 더빙 작업으로 다시 시도할 수 있습니다.
          </p>
        </Card>
      )}

      {/* ─── Script editor ─── */}
      {completedLangs.length > 0 && spaceSeq && (
        <Card>
          <CardTitle>스크립트 수정</CardTitle>
          <p className="mb-4 mt-1 text-xs text-surface-500">
            번역이 잘못된 경우 문장별로 수정하고 오디오를 재생성할 수 있습니다.
          </p>
          <div className="space-y-2">
            {completedLangs.map((code) => (
              <ScriptEditor
                key={code}
                langCode={code}
                projectSeq={projectMap[code] || 0}
                spaceSeq={spaceSeq}
              />
            ))}
          </div>
        </Card>
      )}

      {/* ─── Subtitle editor ─── */}
      {completedLangs.length > 0 && spaceSeq && (
        <Card>
          <CardTitle>자막 편집 · 다운로드</CardTitle>
          <p className="mb-4 mt-1 text-xs text-surface-500">
            자막 타이밍과 텍스트를 수정하고 SRT 파일로 다운로드할 수 있습니다.
          </p>
          <div className="space-y-2">
            {completedLangs.map((code) => (
              <SubtitleEditor
                key={code}
                langCode={code}
                projectSeq={projectMap[code] || 0}
                spaceSeq={spaceSeq}
              />
            ))}
          </div>
        </Card>
      )}

      {/* ─── Actions ─── */}
      <div className="flex gap-3 justify-center">
        <Button variant="secondary" onClick={handleNewDubbing}>
          <RotateCcw className="h-4 w-4" /> 새 더빙
        </Button>
        <Button onClick={handleGoToDashboard}>대시보드로</Button>
      </div>
    </div>
  )
}
