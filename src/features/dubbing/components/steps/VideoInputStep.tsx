'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Link2, Upload, Film, ArrowRight, Play, FileVideo, Zap, Loader2, Search, Lock, Info } from 'lucide-react'

function YouTubeLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 28 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="28" height="20" rx="4" fill="#FF0000" />
      <path d="M18.5 10L11.5 14V6L18.5 10Z" fill="white" />
    </svg>
  )
}
import { Card, Button, Input, Badge, Tabs, TabsList, TabsTrigger, TabsContent, Progress } from '@/components/ui'
import { useDubbingStore } from '../../store/dubbingStore'
import { usePersoFlow } from '../../hooks/usePersoFlow'
import { useChannelStats, useMyVideos } from '@/hooks/useYouTubeData'
import { isValidVideoUrl, isValidYouTubeUrl } from '@/utils/validators'
import { formatDuration } from '@/utils/formatters'
import { getPersoFileUrl } from '@/lib/api-client'

export function VideoInputStep() {
  const { videoMeta, setVideoSource, setIsShort, nextStep } = useDubbingStore()
  const { uploadLocalVideo, importVideoByUrl } = usePersoFlow()

  const searchParams = useSearchParams()
  const [url, setUrl] = useState(searchParams.get('url') ?? '')
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: channel, isLoading: channelLoading } = useChannelStats()
  const isConnected = !!channel
  const { data: myVideos = [], isLoading: myVideosLoading } = useMyVideos(50)
  const [videoSearch, setVideoSearch] = useState('')

  const publicVideos = useMemo(
    () => myVideos.filter((v) => v.privacyStatus === 'public'),
    [myVideos],
  )
  const filteredVideos = useMemo(() => {
    const q = videoSearch.trim().toLowerCase()
    if (!q) return publicVideos
    return publicVideos.filter((v) => v.title.toLowerCase().includes(q))
  }, [publicVideos, videoSearch])
  const hiddenCount = myVideos.length - publicVideos.length

  const handleMyVideoSelect = async (videoId: string) => {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`
    setUrl(videoUrl)
    setLoading(true)
    setError(null)
    try {
      setVideoSource({ type: 'channel', url: videoUrl, videoId })
      await importVideoByUrl(videoUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import video')
    } finally {
      setLoading(false)
    }
  }

  const handleUrlSubmit = async () => {
    if (!isValidVideoUrl(url)) return
    setLoading(true)
    setError(null)
    try {
      setVideoSource({ type: 'url', url })
      await importVideoByUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import video')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = async (file: File) => {
    setLoading(true)
    setError(null)
    setUploadProgress(10)
    try {
      setVideoSource({ type: 'upload', file })
      setUploadProgress(30)
      await uploadLocalVideo(file)
      setUploadProgress(100)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setLoading(false)
      setUploadProgress(0)
    }
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }

  // Auto-detect shorts: ≤3min (YouTube Shorts 최대 길이)
  useEffect(() => {
    if (videoMeta) {
      const isShortCandidate = videoMeta.durationMs <= 180000
      setIsShort(isShortCandidate)
    }
  }, [videoMeta, setIsShort])

  const isValid = url.length > 0 && isValidVideoUrl(url)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-surface-900 dark:text-white">영상 선택</h2>
        <p className="mt-1 text-surface-500">YouTube URL을 붙여넣거나 영상 파일을 업로드하세요</p>
      </div>

      <Tabs
        defaultValue={searchParams.get('url') ? 'url' : 'upload'}
        onChange={() => setError(null)}
      >
        <TabsList className="mx-auto w-fit">
          <TabsTrigger value="upload">
            <span className="flex items-center gap-1.5"><Upload className="h-4 w-4" /> 업로드</span>
          </TabsTrigger>
          <TabsTrigger value="channel">
            <span className="flex items-center gap-1.5"><Film className="h-4 w-4" /> 내 영상</span>
          </TabsTrigger>
          <TabsTrigger value="url">
            <span className="flex items-center gap-1.5"><Link2 className="h-4 w-4" /> 영상 URL</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="url" className="mt-6">
          <Card>
            <div className="mb-3 flex items-start gap-2 rounded-lg bg-blue-50 p-2.5 text-xs text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <p>공개 영상만 가져올 수 있습니다. 비공개·일부공개 영상은 외부 다운로드가 막혀 있어 가져올 수 없으니, YouTube에서 공개로 변경하거나 영상 파일을 직접 업로드해 주세요.</p>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="YouTube URL 또는 영상 직접 링크 (.mp4, .mov, .webm)"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setError(null) }}
                icon={<Play className="h-4 w-4" />}
                onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                error={error && !loading ? error : undefined}
              />
              <Button onClick={handleUrlSubmit} loading={loading} disabled={!isValid || loading} className="whitespace-nowrap">
                {loading ? '가져오는 중...' : '가져오기'}
              </Button>
            </div>
            {loading && (
              <p className="mt-2 text-xs text-surface-400">
                {isValidYouTubeUrl(url) ? 'YouTube에서' : '원격 서버에서'} 다운로드 중... 긴 영상은 몇 분 걸릴 수 있습니다.
              </p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="upload" className="mt-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/mov,video/webm,.mp4,.mov,.webm"
            className="hidden"
            onChange={handleFileInputChange}
          />
          <Card
            role="button"
            tabIndex={0}
            aria-label="영상 파일 선택"
            className="cursor-pointer border-2 border-dashed border-surface-300 text-center transition-colors hover:border-brand-400 focus-ring dark:border-surface-700"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => !loading && fileInputRef.current?.click()}
            onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !loading) { e.preventDefault(); fileInputRef.current?.click() } }}
          >
            <div className="py-8">
              {loading ? (
                <>
                  <FileVideo className="mx-auto h-10 w-10 text-brand-500 animate-pulse" />
                  <p className="mt-3 text-sm font-medium text-surface-700 dark:text-surface-300">
                    Perso.ai에 업로드 중...
                  </p>
                  <Progress value={uploadProgress} size="sm" className="mx-auto mt-3 max-w-xs" />
                </>
              ) : (
                <>
                  <Upload className="mx-auto h-10 w-10 text-surface-400" />
                  <p className="mt-3 text-sm font-medium text-surface-700 dark:text-surface-300">
                    영상을 드래그하거나 클릭해서 선택하세요
                  </p>
                  <p className="mt-1 text-xs text-surface-400">MP4, MOV, WebM — 최대 30분</p>
                </>
              )}
            </div>
          </Card>
          {error && !loading && (
            <p className="mt-2 text-sm text-red-500">{error}</p>
          )}
        </TabsContent>

        <TabsContent value="channel" className="mt-6">
          {channelLoading ? (
            <Card className="py-12 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-surface-400" />
              <p className="mt-3 text-sm text-surface-500">채널 정보 불러오는 중...</p>
            </Card>
          ) : !isConnected ? (
            <Card className="py-12 text-center">
              <Film className="mx-auto h-10 w-10 text-surface-400" />
              <p className="mt-3 text-sm text-surface-500">YouTube 채널을 연결하면 영상을 바로 선택할 수 있습니다</p>
              <Button variant="outline" className="mt-4" onClick={() => window.location.href = '/youtube'}>채널 연결</Button>
            </Card>
          ) : myVideosLoading ? (
            <Card className="py-12 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-surface-400" />
              <p className="mt-3 text-sm text-surface-500">영상 목록 불러오는 중...</p>
            </Card>
          ) : myVideos.length === 0 ? (
            <Card className="py-12 text-center">
              <Film className="mx-auto h-10 w-10 text-surface-400" />
              <p className="mt-3 text-sm text-surface-500">채널에 업로드된 영상이 없습니다</p>
            </Card>
          ) : publicVideos.length === 0 ? (
            <Card className="py-12 text-center">
              <Lock className="mx-auto h-10 w-10 text-surface-400" />
              <p className="mt-3 text-sm text-surface-500">공개된 영상이 없습니다</p>
              <p className="mt-1 text-xs text-surface-400">
                비공개·일부공개 영상은 외부 다운로드가 막혀 가져올 수 없습니다.<br />
                YouTube에서 공개로 변경하거나 영상 파일을 직접 업로드해 주세요.
              </p>
            </Card>
          ) : (
            <Card>
              <div className="relative mb-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
                <input
                  type="text"
                  value={videoSearch}
                  onChange={(e) => setVideoSearch(e.target.value)}
                  placeholder="영상 제목으로 검색"
                  className="w-full rounded-md border border-surface-300 bg-white py-2 pl-9 pr-3 text-sm text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-900 dark:text-white"
                />
              </div>

              <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {filteredVideos.length === 0 ? (
                  <p className="py-8 text-center text-sm text-surface-500">검색 결과가 없습니다</p>
                ) : (
                  filteredVideos.map((video) => (
                    <div
                      key={video.videoId}
                      className="flex items-center justify-between rounded-lg border border-surface-200 p-3 transition-colors hover:bg-surface-50 dark:border-surface-800 dark:hover:bg-surface-800/50"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {video.thumbnail ? (
                          <Image
                            src={video.thumbnail}
                            alt={video.title}
                            width={64}
                            height={36}
                            className="rounded object-cover shrink-0"
                          />
                        ) : (
                          <div className="flex h-9 w-16 shrink-0 items-center justify-center rounded bg-surface-100 dark:bg-surface-800">
                            <YouTubeLogo className="h-5 w-7" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-surface-900 dark:text-white">{video.title}</p>
                          <p className="text-xs text-surface-500">
                            {new Date(video.publishedAt).toLocaleDateString('ko-KR')}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 ml-3"
                        loading={loading}
                        disabled={loading}
                        onClick={() => handleMyVideoSelect(video.videoId)}
                      >
                        선택
                      </Button>
                    </div>
                  ))
                )}
              </div>

              {hiddenCount > 0 && !videoSearch && (
                <p className="mt-3 text-xs text-surface-400">
                  비공개·일부공개 영상 {hiddenCount}개는 외부 다운로드가 막혀 표시되지 않습니다.
                </p>
              )}
              {error && !loading && (
                <p className="mt-3 text-sm text-red-500">{error}</p>
              )}
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Video preview */}
      {videoMeta && !loading && (
        <Card className="animate-slide-up">
          <div className="flex gap-4">
            {videoMeta.thumbnail ? (
              <Image
                src={videoMeta.thumbnail.startsWith('http') ? videoMeta.thumbnail : getPersoFileUrl(videoMeta.thumbnail)}
                alt={videoMeta.title}
                width={128}
                height={80}
                className="shrink-0 rounded-lg object-cover bg-surface-200"
                unoptimized={!videoMeta.thumbnail.startsWith('http')}
              />
            ) : (
              <div className="flex h-20 w-32 shrink-0 items-center justify-center rounded-lg bg-surface-100 dark:bg-surface-800">
                <YouTubeLogo className="h-8 w-12" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-surface-900 dark:text-white truncate">{videoMeta.title}</h3>
                {videoMeta.durationMs <= 180000 && (
                  <Badge variant="brand" className="shrink-0">
                    <Zap className="h-3 w-3" /> Shorts
                  </Badge>
                )}
              </div>
              <p className="text-sm text-surface-500">{videoMeta.channelTitle}</p>
              {videoMeta.duration > 0 && (
                <p className="text-xs text-surface-400 mt-1">{formatDuration(videoMeta.duration)} 길이</p>
              )}
            </div>
          </div>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={nextStep} disabled={!videoMeta || loading}>
          다음: 언어 선택
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
