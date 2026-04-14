'use client'

import { useState, useCallback } from 'react'
import { Upload, Loader2, CheckCircle2, ExternalLink, Video } from 'lucide-react'
import { Card, CardTitle, Button, Badge } from '@/components/ui'
import { LanguageBadge } from '@/components/shared/LanguageBadge'
import { EmptyState } from '@/components/feedback/EmptyState'
import { formatDuration } from '@/utils/formatters'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { ytUploadVideo, ytUploadCaption, getDownloadLinks } from '@/lib/api-client'
import { dbMutation } from '@/lib/api/dbMutation'
import { getLanguageByCode } from '@/utils/languages'
import type { CompletedJobLanguage } from '@/lib/db/queries/dashboard'

type UploadState = 'idle' | 'fetching' | 'uploading' | 'done' | 'error'

async function fetchCompletedLanguages(uid: string): Promise<CompletedJobLanguage[]> {
  const res = await fetch(`/api/dashboard/completed-languages?uid=${encodeURIComponent(uid)}`, { cache: 'no-store' })
  const json = await res.json()
  if (!json.ok) throw new Error(json.error?.message || 'Failed to load')
  return json.data
}

interface UploadRowProps {
  item: CompletedJobLanguage
  userId: string
}

function UploadRow({ item, userId }: UploadRowProps) {
  const addToast = useNotificationStore((s) => s.addToast)
  const queryClient = useQueryClient()
  const [state, setState] = useState<UploadState>(item.youtube_video_id ? 'done' : 'idle')
  const [videoId, setVideoId] = useState<string | null>(item.youtube_video_id)
  const lang = getLanguageByCode(item.language_code)

  const handleUpload = useCallback(async () => {
    setState('fetching')
    try {
      // Use stored URL or fetch from Perso on-demand (for jobs interrupted mid-poll)
      let videoUrl = item.dubbed_video_url
      let srtUrl = item.srt_url

      if (!videoUrl && item.project_seq && item.space_seq) {
        const downloads = await getDownloadLinks(item.project_seq, item.space_seq, 'all')
        videoUrl = downloads.videoFile?.videoDownloadLink ?? null
        srtUrl = srtUrl ?? downloads.srtFile?.translatedSubtitleDownloadLink ?? null
        if (!videoUrl) throw new Error('더빙 영상 다운로드 링크를 찾을 수 없습니다')
      }

      if (!videoUrl) throw new Error('더빙 영상 다운로드 링크를 찾을 수 없습니다')

      setState('uploading')
      const result = await ytUploadVideo({
        videoUrl,
        title: `[${lang?.name}] ${item.video_title}`,
        description: `${item.video_title} - ${lang?.name} 더빙 by CreatorDub AI`,
        tags: ['CreatorDub', 'AI더빙', lang?.name || item.language_code, 'dubbed'],
        privacyStatus: 'private',
        language: item.language_code,
      })

      // Try uploading SRT if available
      if (srtUrl) {
        try {
          const srtRes = await fetch(srtUrl)
          const srtText = await srtRes.text()
          await ytUploadCaption({
            videoId: result.videoId,
            language: item.language_code,
            name: `${lang?.name} subtitles`,
            srtContent: srtText,
          })
        } catch {
          // SRT optional
        }
      }

      setVideoId(result.videoId)
      setState('done')
      addToast({ type: 'success', title: `${lang?.name} 업로드 완료`, message: '비공개로 업로드됨' })

      await dbMutation({
        type: 'createYouTubeUpload',
        payload: {
          userId,
          youtubeVideoId: result.videoId,
          title: `[${lang?.name}] ${item.video_title}`,
          languageCode: item.language_code,
          privacyStatus: 'private',
          isShort: false,
        },
      })
      queryClient.invalidateQueries({ queryKey: ['completed-languages'] })
    } catch (err) {
      setState('error')
      addToast({ type: 'error', title: '업로드 실패', message: err instanceof Error ? err.message : '알 수 없는 오류' })
    }
  }, [item, lang, userId, addToast, queryClient])

  const isLoading = state === 'fetching' || state === 'uploading'
  const loadingLabel = state === 'fetching' ? '링크 확인 중...' : '업로드 중...'

  return (
    <div className="flex items-center gap-3 rounded-lg border border-surface-200 p-3 dark:border-surface-800">
      <div className="flex h-10 w-16 shrink-0 items-center justify-center rounded bg-surface-100 text-xs text-surface-400 dark:bg-surface-800">
        {formatDuration(Math.round(item.video_duration_ms / 1000))}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-surface-900 dark:text-white">{item.video_title}</p>
        <div className="mt-1 flex items-center gap-1.5">
          {lang && <LanguageBadge code={item.language_code} />}
          {videoId && (
            <a
              href={`https://youtube.com/watch?v=${videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-brand-500 hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              영상 보기
            </a>
          )}
        </div>
      </div>

      <div className="shrink-0">
        {state === 'done' ? (
          <Badge variant="success">
            <CheckCircle2 className="h-3 w-3" />
            업로드됨
          </Badge>
        ) : isLoading ? (
          <div className="flex items-center gap-1.5 text-xs text-surface-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            {loadingLabel}
          </div>
        ) : (
          <Button size="sm" onClick={handleUpload} disabled={state === 'error'}>
            <Upload className="h-3.5 w-3.5" />
            YouTube 업로드
          </Button>
        )}
      </div>
    </div>
  )
}

export default function UploadsPage() {
  const user = useAuthStore((s) => s.user)
  const { data: items = [], isLoading } = useQuery<CompletedJobLanguage[]>({
    queryKey: ['completed-languages', user?.uid],
    queryFn: () => fetchCompletedLanguages(user!.uid),
    enabled: !!user,
    staleTime: 60_000,
  })

  // Group by job
  const jobs = items.reduce<Record<number, { title: string; durationMs: number; createdAt: string; langs: CompletedJobLanguage[] }>>((acc, item) => {
    if (!acc[item.job_id]) {
      acc[item.job_id] = {
        title: item.video_title,
        durationMs: item.video_duration_ms,
        createdAt: item.created_at,
        langs: [],
      }
    }
    acc[item.job_id].langs.push(item)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">YouTube 업로드</h1>
        <p className="text-surface-500 dark:text-surface-400">완료된 더빙 영상을 YouTube에 업로드하세요</p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-surface-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">불러오는 중...</span>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Video className="h-12 w-12" />}
          title="업로드할 영상이 없습니다"
          description="더빙이 완료된 영상이 여기에 표시됩니다."
        />
      ) : (
        <div className="space-y-4">
          {Object.entries(jobs).map(([jobId, job]) => (
            <Card key={jobId}>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{job.title}</CardTitle>
                  <p className="text-xs text-surface-400 mt-0.5">
                    {formatDuration(Math.round(job.durationMs / 1000))} · {new Date(job.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <Badge variant="success">{job.langs.length}개 언어</Badge>
              </div>
              <div className="space-y-2">
                {job.langs.map((item) => (
                  <UploadRow key={`${item.job_id}-${item.language_code}`} item={item} userId={user?.uid || ''} />
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
