'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Link2, Upload, Film, ArrowRight, Play, FileVideo, Zap } from 'lucide-react'
import { Card, Button, Input, Badge, Tabs, TabsList, TabsTrigger, TabsContent, Progress } from '@/components/ui'
import { useDubbingStore } from '../../store/dubbingStore'
import { usePersoFlow } from '../../hooks/usePersoFlow'
import { isValidVideoUrl, isValidYouTubeUrl } from '@/utils/validators'
import { formatDuration } from '@/utils/formatters'
import { getPersoFileUrl } from '@/lib/api-client'

export function VideoInputStep() {
  const { videoMeta, setVideoSource, setIsShort, nextStep } = useDubbingStore()
  const { uploadLocalVideo, importVideoByUrl } = usePersoFlow()

  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

      <Tabs defaultValue="upload">
        <TabsList className="mx-auto w-fit">
          <TabsTrigger value="url">
            <span className="flex items-center gap-1.5"><Link2 className="h-4 w-4" /> 영상 URL</span>
          </TabsTrigger>
          <TabsTrigger value="upload">
            <span className="flex items-center gap-1.5"><Upload className="h-4 w-4" /> 업로드</span>
          </TabsTrigger>
          <TabsTrigger value="channel">
            <span className="flex items-center gap-1.5"><Film className="h-4 w-4" /> 내 영상</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="url" className="mt-6">
          <Card>
            <div className="flex gap-2">
              <Input
                placeholder="YouTube URL 또는 영상 직접 링크 (.mp4, .mov, .webm)"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setError(null) }}
                icon={<Play className="h-4 w-4" />}
                onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                error={error && !loading ? error : undefined}
              />
              <Button onClick={handleUrlSubmit} loading={loading} disabled={!isValid || loading}>
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
          <Card className="py-12 text-center">
            <Film className="mx-auto h-10 w-10 text-surface-400" />
            <p className="mt-3 text-sm text-surface-500">YouTube 채널을 연결하면 영상을 바로 선택할 수 있습니다</p>
            <Button variant="outline" className="mt-4">채널 연결</Button>
          </Card>
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
              <div className="flex h-20 w-32 shrink-0 items-center justify-center rounded-lg bg-surface-200 text-sm text-surface-400 dark:bg-surface-800">
                {videoMeta.duration > 0 ? formatDuration(videoMeta.duration) : '로컬 파일'}
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
