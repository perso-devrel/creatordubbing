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
import { ytUploadVideo, ytUploadCaption, getPersoFileUrl } from '@/lib/api-client'
import { dbMutation } from '@/lib/api/dbMutation'
import { ScriptEditor } from '../ScriptEditor'

type UploadStatus = 'idle' | 'uploading' | 'done' | 'error'

interface LangUploadState {
  status: UploadStatus
  progress: number
  videoId?: string
  error?: string
}

export function UploadStep() {
  const { selectedLanguages, videoMeta, videoSource, languageProgress, dbJobId, spaceSeq, projectMap, uploadSettings, reset } = useDubbingStore()
  const { fetchDownloads } = usePersoFlow()
  const addToast = useNotificationStore((s) => s.addToast)
  const userId = useAuthStore((s) => s.user?.uid)
  const router = useRouter()

  // Original YouTube link detection (for auto-attach)
  const originalYouTubeId =
    videoSource?.type === 'url' && videoSource.url ? extractVideoId(videoSource.url) : null
  const originalYouTubeUrl = originalYouTubeId
    ? `https://www.youtube.com/watch?v=${originalYouTubeId}`
    : null

  const { autoUpload, uploadAsShort, attachOriginalLink, title: settingsTitle, description: settingsDescription, tags: settingsTags, privacyStatus } = uploadSettings

  const [loadingDownload, setLoadingDownload] = useState<string | null>(null)
  const [ytUploads, setYtUploads] = useState<Record<string, LangUploadState>>({})
  const [studioOpenedLang, setStudioOpenedLang] = useState<string | null>(null)
  const autoUploadTriggered = useRef(false)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const buildDescription = useCallback(
    (langName: string) => {
      const base = settingsDescription?.trim()
        ? settingsDescription
        : `${videoMeta?.title || 'Video'} - ${langName} 더빙 by CreatorDub AI\n\n원본 영상에서 AI 보이스 클론으로 더빙되었습니다.`
      if (attachOriginalLink && originalYouTubeUrl) {
        return `${base}\n\n원본 영상: ${originalYouTubeUrl}`
      }
      return base
    },
    [settingsDescription, videoMeta?.title, attachOriginalLink, originalYouTubeUrl],
  )

  const handleNewDubbing = () => reset()
  const handleGoToDashboard = () => { reset(); router.push('/dashboard') }

  // Audio + Studio helper — downloads audio and opens Studio in popup
  // (iframe embed is blocked by YouTube's X-Frame-Options: DENY, so we use a popup)
  const handleAudioToStudio = useCallback(async (langCode: string) => {
    const lang = getLanguageByCode(langCode)
    if (!lang) return
    setStudioOpenedLang(langCode)
    try {
      // 1. Fetch audio download link
      const data = await fetchDownloads(langCode, 'voiceAudio')
      const audioUrl = data?.audioFile?.voiceAudioDownloadLink
      if (audioUrl) {
        // Trigger download in new tab
        window.open(audioUrl, '_blank')
      }

      // 2. Copy language code to clipboard (Studio audio track needs it)
      try {
        await navigator.clipboard.writeText(langCode)
      } catch {
        // Clipboard may fail on insecure contexts — ignore
      }

      // 3. Open Studio in popup — deep-link to original video's audio page if available
      const studioUrl = originalYouTubeId
        ? `https://studio.youtube.com/video/${originalYouTubeId}/translations/audio`
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

  const handleDownload = useCallback(async (langCode: string, type: 'video' | 'voiceAudio' | 'translatedSubtitle') => {
    setLoadingDownload(`${langCode}-${type}`)
    try {
      const target = type === 'video' ? 'dubbingVideo' : type === 'voiceAudio' ? 'voiceAudio' : 'translatedSubtitle'
      const data = await fetchDownloads(langCode, target as 'all')
      if (!data) return

      let url: string | undefined
      if (type === 'video' && data.videoFile?.videoDownloadLink) url = data.videoFile.videoDownloadLink
      else if (type === 'voiceAudio' && data.audioFile?.voiceAudioDownloadLink) url = data.audioFile.voiceAudioDownloadLink
      else if (type === 'translatedSubtitle' && data.srtFile?.translatedSubtitleDownloadLink) url = data.srtFile.translatedSubtitleDownloadLink
      else if (data.zippedFileDownloadLink) url = data.zippedFileDownloadLink

      if (url) window.open(url, '_blank')
    } finally {
      setLoadingDownload(null)
    }
  }, [fetchDownloads])

  // Upload dubbed video to YouTube
  const handleYouTubeUpload = useCallback(async (langCode: string) => {
    if (!isAuthenticated) {
      addToast({ type: 'error', title: 'YouTube에 먼저 로그인해주세요' })
      return
    }

    const lang = getLanguageByCode(langCode)
    if (!lang) return

    setYtUploads((prev) => ({ ...prev, [langCode]: { status: 'uploading', progress: 0 } }))

    try {
      // 1. Get dubbed video download link from Perso (always fresh — avoids stale DB link)
      const downloads = await fetchDownloads(langCode, 'dubbingVideo')
      const rawVideoUrl = downloads?.videoFile?.videoDownloadLink
      if (!rawVideoUrl) throw new Error('더빙 영상 다운로드 링크를 찾을 수 없습니다')
      const videoUrl = rawVideoUrl.startsWith('http') ? rawVideoUrl : getPersoFileUrl(rawVideoUrl)

      // 2. Upload to YouTube — server fetches video from Perso CDN directly (avoids browser CORS)
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
      setYtUploads((prev) => ({
        ...prev,
        [langCode]: { status: 'uploading', progress: 90 },
      }))

      // 4. Try uploading SRT caption
      setYtUploads((prev) => ({ ...prev, [langCode]: { status: 'uploading', progress: 92 } }))
      try {
        const srtDownloads = await fetchDownloads(langCode, 'translatedSubtitle')
        const srtUrl = srtDownloads?.srtFile?.translatedSubtitleDownloadLink
        if (srtUrl) {
          const srtResponse = await fetch(srtUrl)
          const srtText = await srtResponse.text()
          await ytUploadCaption({
            videoId: result.videoId,
            language: langCode,
            name: `${lang.name} subtitles`,
            srtContent: srtText,
          })
        }
      } catch {
        // Caption upload is optional, don't fail the whole process
      }

      setYtUploads((prev) => ({
        ...prev,
        [langCode]: { status: 'done', progress: 100, videoId: result.videoId },
      }))

      // Save to DB
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
      } catch {
        // DB save best-effort
      }

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
  }, [fetchDownloads, videoMeta, addToast, userId, dbJobId, uploadAsShort, isAuthenticated, settingsTitle, settingsTags, privacyStatus, buildDescription])

  // Upload ALL completed languages to YouTube (2 concurrent)
  const handleUploadAll = async () => {
    const pending = completedLangs.filter((code) => ytUploads[code]?.status !== 'done')
    const CONCURRENCY = 2
    for (let i = 0; i < pending.length; i += CONCURRENCY) {
      const batch = pending.slice(i, i + CONCURRENCY)
      await Promise.all(batch.map((code) => handleYouTubeUpload(code)))
    }
  }

  const completedLangs = selectedLanguages.filter((code) => {
    const lp = languageProgress.find((p) => p.langCode === code)
    return lp?.progressReason === 'COMPLETED' || lp?.progressReason === 'Completed'
  })

  const failedLangs = selectedLanguages.filter((code) => {
    const lp = languageProgress.find((p) => p.langCode === code)
    return lp?.progressReason === 'FAILED' || lp?.progressReason === 'Failed' || lp?.progressReason === 'CANCELED'
  })

  const anyUploading = Object.values(ytUploads).some((s) => s.status === 'uploading')

  // Auto-upload on mount if enabled
  useEffect(() => {
    if (autoUpload && isAuthenticated && completedLangs.length > 0 && !autoUploadTriggered.current && !anyUploading) {
      autoUploadTriggered.current = true
      handleUploadAll()
    }
  }, [autoUpload, isAuthenticated, completedLangs.length, anyUploading, handleUploadAll])

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
          {completedLangs.length} / {selectedLanguages.length}개 언어 완료. 다운로드하거나 YouTube에 업로드하세요.
        </p>
      </div>

      {/* YouTube Auto Upload */}
      <Card className="border-brand-200 dark:border-brand-800">
        <div className="flex items-center justify-between mb-4">
          <CardTitle>YouTube 자동 업로드</CardTitle>
          {isAuthenticated ? (
            <Badge variant="success">인증됨</Badge>
          ) : (
            <Badge variant="warning">Google 로그인 시 자동 인증</Badge>
          )}
        </div>

        {isAuthenticated ? (
          <>
            <p className="text-sm text-surface-500 mb-4">
              더빙된 영상을 YouTube에 새 영상으로 업로드합니다. 안전을 위해 비공개로 업로드되며, 이후 YouTube Studio에서 공개 설정을 변경할 수 있습니다.
            </p>

            {/* Upload options summary — read-only, set in Step 3 */}
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

            {/* Upload info */}
            <div className="mb-4 rounded-lg border border-surface-200 p-3 dark:border-surface-800">
              <div className="flex items-center gap-2 mb-2">
                <Upload className="h-4 w-4 text-surface-400" />
                <span className="text-sm font-medium text-surface-700 dark:text-surface-300">더빙 영상을 새 영상으로 업로드</span>
              </div>
              <p className="text-xs text-surface-500">
                각 언어별 더빙된 영상이 별도의 새 영상으로 YouTube에 업로드됩니다. 원본 영상은 변경되지 않습니다.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Volume2 className="h-4 w-4 text-surface-400" />
                <span className="text-xs text-surface-500">
                  오디오만 필요하면 아래 다운로드에서 Audio를 받아 YouTube Studio에서 수동 추가하세요.
                </span>
              </div>
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleYouTubeUpload(code)}
                        disabled={anyUploading}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        업로드
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>

            {completedLangs.length > 1 && (
              <Button
                className="mt-3 w-full"
                onClick={handleUploadAll}
                disabled={anyUploading}
                loading={anyUploading}
              >
                <Upload className="h-4 w-4" />
                전체 YouTube 업로드
              </Button>
            )}
          </>
        ) : (
          <p className="text-sm text-surface-500">
            YouTube에 로그인하면 더빙된 영상을 자동으로 채널에 업로드할 수 있습니다.
            자막(SRT)도 함께 업로드됩니다.
          </p>
        )}
      </Card>

      {/* Download section */}
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
                      <p className="text-xs text-surface-400">Video + Audio + SRT</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleDownload(code, 'video')}
                      loading={loadingDownload === `${code}-video`}>
                      <Download className="h-3.5 w-3.5" /> Video
                    </Button>
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

      {/* Failed languages */}
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

      {/* Script editor — fix translation mistakes */}
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

      {/* YouTube Multi-Audio Track — audio + Studio popup helper */}
      {completedLangs.length > 0 && (
        <Card>
          <CardTitle>원본 영상에 오디오 트랙 추가 (Multi-Audio)</CardTitle>
          <p className="text-xs text-surface-500 mb-3">
            하나의 영상에 여러 오디오 트랙을 붙이려면 YouTube Studio에서 수동 적용이 필요합니다.
            아래 버튼을 누르면 오디오가 다운로드되고 Studio가 팝업으로 열립니다. 언어 코드는 클립보드에 복사됩니다.
          </p>
          <div className="mb-3 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 dark:bg-amber-900/10 dark:border-amber-800 dark:text-amber-300">
            Multi-Audio Track 업로드는 YouTube 채널 자격 요건(구독자 1,000명 이상)이 필요합니다.
            {!originalYouTubeId && ' 원본이 YouTube URL이 아니면 Studio 홈으로 이동합니다 — 대상 영상을 직접 선택하세요.'}
          </div>
          <div className="space-y-2">
            {completedLangs.map((code) => {
              const lang = getLanguageByCode(code)
              if (!lang) return null
              const opening = studioOpenedLang === code
              return (
                <div
                  key={code}
                  className="flex items-center justify-between rounded-lg border border-surface-200 p-3 dark:border-surface-800"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{lang.flag}</span>
                    <div>
                      <p className="text-sm font-medium text-surface-900 dark:text-white">{lang.name}</p>
                      <p className="text-xs text-surface-400">오디오 다운로드 + Studio 팝업</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAudioToStudio(code)}
                    loading={opening}
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    오디오 + Studio
                  </Button>
                </div>
              )
            })}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3"
            onClick={() =>
              window.open(
                originalYouTubeId
                  ? `https://studio.youtube.com/video/${originalYouTubeId}/translations/audio`
                  : 'https://studio.youtube.com',
                '_blank',
              )
            }
          >
            <ExternalLink className="h-4 w-4" />
            Studio만 열기
          </Button>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-center">
        <Button variant="secondary" onClick={handleNewDubbing}>
          <RotateCcw className="h-4 w-4" /> 새 더빙
        </Button>
        <Button onClick={handleGoToDashboard}>대시보드로</Button>
      </div>
    </div>
  )
}
