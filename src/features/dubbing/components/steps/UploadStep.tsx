'use client'

import { Download, ExternalLink, Copy, Check, RotateCcw, Upload, Loader2 } from 'lucide-react'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, CardTitle, Badge, Progress } from '@/components/ui'
import { getLanguageByCode } from '@/utils/languages'
import { useNotificationStore } from '@/stores/notificationStore'
import { useDubbingStore } from '../../store/dubbingStore'
import { usePersoFlow } from '../../hooks/usePersoFlow'
import { useAuthStore } from '@/stores/authStore'
import { ytUploadVideo, ytUploadCaption } from '@/lib/api-client'

type UploadStatus = 'idle' | 'uploading' | 'done' | 'error'

interface LangUploadState {
  status: UploadStatus
  progress: number
  videoId?: string
  error?: string
}

function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem('google_access_token')
}

async function dbMutationUpload(action: {
  type: 'createYouTubeUpload' | 'updateJobLanguageYouTube'
  payload: Record<string, unknown>
}): Promise<unknown> {
  try {
    const res = await fetch('/api/dashboard/mutations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action),
      cache: 'no-store',
    })
    const body = await res.json().catch(() => null)
    if (!body || !body.ok) return null
    return body.data
  } catch {
    return null
  }
}

export function UploadStep() {
  const { selectedLanguages, videoMeta, languageProgress, isShort, dbJobId, reset } = useDubbingStore()
  const { fetchDownloads } = usePersoFlow()
  const addToast = useNotificationStore((s) => s.addToast)
  const userId = useAuthStore((s) => s.user?.uid)
  const router = useRouter()

  const [copiedLang, setCopiedLang] = useState<string | null>(null)
  const [loadingDownload, setLoadingDownload] = useState<string | null>(null)
  const [ytUploads, setYtUploads] = useState<Record<string, LangUploadState>>({})
  const [uploadAsShort, setUploadAsShort] = useState(isShort)
  const ytAuthed = !!getStoredAccessToken()

  const handleCopy = (langCode: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedLang(langCode)
    setTimeout(() => setCopiedLang(null), 2000)
  }

  const handleNewDubbing = () => reset()
  const handleGoToDashboard = () => { reset(); router.push('/dashboard') }

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
    const token = getStoredAccessToken()
    if (!token) {
      addToast({ type: 'error', title: 'YouTube에 먼저 로그인해주세요' })
      return
    }

    const lang = getLanguageByCode(langCode)
    if (!lang) return

    setYtUploads((prev) => ({ ...prev, [langCode]: { status: 'uploading', progress: 0 } }))

    try {
      // 1. Get dubbed video download link from Perso
      const downloads = await fetchDownloads(langCode, 'dubbingVideo')
      const videoUrl = downloads?.videoFile?.videoDownloadLink
      if (!videoUrl) throw new Error('더빙 영상 다운로드 링크를 찾을 수 없습니다')

      // 2. Fetch the video file as blob
      setYtUploads((prev) => ({ ...prev, [langCode]: { status: 'uploading', progress: 10 } }))
      const videoResponse = await fetch(videoUrl)
      if (!videoResponse.ok) throw new Error('영상 다운로드 실패')
      const videoBlob = await videoResponse.blob()

      // 3. Upload to YouTube
      setYtUploads((prev) => ({ ...prev, [langCode]: { status: 'uploading', progress: 30 } }))
      const titlePrefix = uploadAsShort ? '#Shorts ' : ''
      const ytTitle = `${titlePrefix}[${lang.name}] ${videoMeta?.title || 'Dubbed Video'}`
      const result = await ytUploadVideo({
        accessToken: token,
        video: videoBlob,
        title: ytTitle,
        description: `${videoMeta?.title || 'Video'} - ${lang.name} 더빙 by CreatorDub AI\n\n원본 영상에서 AI 보이스 클론으로 더빙되었습니다.`,
        tags: ['CreatorDub', 'AI더빙', lang.name, 'dubbed', ...(uploadAsShort ? ['Shorts'] : [])],
        privacyStatus: 'private',
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
            accessToken: token,
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
          await dbMutationUpload({
            type: 'createYouTubeUpload',
            payload: {
              userId,
              youtubeVideoId: result.videoId,
              title: ytTitle,
              languageCode: langCode,
              privacyStatus: 'private',
              isShort: uploadAsShort,
            },
          })
          if (dbJobId) {
            await dbMutationUpload({
              type: 'updateJobLanguageYouTube',
              payload: { jobId: dbJobId, langCode, youtubeVideoId: result.videoId },
            })
          }
        }
      } catch {
        // DB save best-effort
      }

      addToast({
        type: 'success',
        title: `${lang.name} YouTube 업로드 완료`,
        message: `영상 ID: ${result.videoId} (비공개)`,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : '업로드 실패'
      setYtUploads((prev) => ({
        ...prev,
        [langCode]: { status: 'error', progress: 0, error: msg },
      }))
      addToast({ type: 'error', title: `${lang?.name} 업로드 실패`, message: msg })
    }
  }, [fetchDownloads, videoMeta, addToast, userId, dbJobId, uploadAsShort])

  // Upload ALL completed languages to YouTube
  const handleUploadAll = async () => {
    for (const code of completedLangs) {
      const state = ytUploads[code]
      if (state?.status === 'done') continue // skip already uploaded
      await handleYouTubeUpload(code)
    }
  }

  const completedLangs = selectedLanguages.filter((code) => {
    const lp = languageProgress.find((p) => p.langCode === code)
    return lp?.progressReason === 'COMPLETED'
  })

  const failedLangs = selectedLanguages.filter((code) => {
    const lp = languageProgress.find((p) => p.langCode === code)
    return lp?.progressReason === 'FAILED' || lp?.progressReason === 'CANCELED'
  })

  const anyUploading = Object.values(ytUploads).some((s) => s.status === 'uploading')

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
          {ytAuthed ? (
            <Badge variant="success">인증됨</Badge>
          ) : (
            <Badge variant="warning">Google 로그인 시 자동 인증</Badge>
          )}
        </div>

        {ytAuthed ? (
          <>
            <p className="text-sm text-surface-500 mb-4">
              더빙된 영상을 YouTube에 새 영상으로 업로드합니다. 안전을 위해 비공개로 업로드되며, 이후 YouTube Studio에서 공개 설정을 변경할 수 있습니다.
            </p>

            {isShort && (
              <div className="mb-4 flex items-center justify-between rounded-lg bg-brand-50 p-3 dark:bg-brand-900/20">
                <div className="flex items-center gap-2">
                  <Badge variant="brand">Shorts 감지됨</Badge>
                  <span className="text-sm text-surface-600 dark:text-surface-400">
                    60초 이하 영상 — #Shorts 태그 자동 추가
                  </span>
                </div>
                <button
                  onClick={() => setUploadAsShort(!uploadAsShort)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all cursor-pointer ${
                    uploadAsShort
                      ? 'bg-brand-500 text-white'
                      : 'bg-surface-200 text-surface-600 dark:bg-surface-700 dark:text-surface-400'
                  }`}
                >
                  {uploadAsShort ? 'Shorts ON' : 'Shorts OFF'}
                </button>
              </div>
            )}

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

      {/* YouTube Studio guide (for multi-audio track) */}
      <Card>
        <CardTitle>YouTube Multi-Audio Track (수동)</CardTitle>
        <p className="text-xs text-surface-500 mb-3">
          위 자동 업로드는 각 언어별 새 영상으로 업로드됩니다.
          하나의 영상에 여러 오디오 트랙을 추가하려면 YouTube Studio에서 수동으로 설정하세요.
        </p>
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 dark:bg-amber-900/10 dark:border-amber-800 dark:text-amber-300">
          Multi-Audio Track 업로드는 YouTube 채널 자격 요건(구독자 1,000명 이상)이 필요합니다.
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => window.open('https://studio.youtube.com', '_blank')}
        >
          <ExternalLink className="h-4 w-4" />
          YouTube Studio 열기
        </Button>
      </Card>

      {/* Translated metadata */}
      <Card>
        <CardTitle>번역된 메타데이터</CardTitle>
        <p className="text-sm text-surface-500 mb-4">각 언어별 번역된 제목과 설명을 복사하세요.</p>
        <div className="space-y-3">
          {completedLangs.map((code) => {
            const lang = getLanguageByCode(code)
            if (!lang) return null
            const title = `[${lang.name}] ${videoMeta?.title || 'Video Title'}`
            const desc = `${videoMeta?.title || 'Video'} - ${lang.name} 더빙 by CreatorDub AI`
            return (
              <div key={code} className="rounded-lg border border-surface-200 p-3 dark:border-surface-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span>{lang.flag}</span>
                    <Badge>{lang.name}</Badge>
                  </div>
                  <button
                    onClick={() => handleCopy(code, `${title}\n\n${desc}`)}
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20"
                  >
                    {copiedLang === code ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copiedLang === code ? '복사됨' : '복사'}
                  </button>
                </div>
                <p className="text-sm font-medium text-surface-900 dark:text-white">{title}</p>
                <p className="text-xs text-surface-500 mt-1">{desc}</p>
              </div>
            )
          })}
        </div>
      </Card>

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
