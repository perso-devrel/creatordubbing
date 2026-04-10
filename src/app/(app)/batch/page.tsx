'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, GripVertical, Trash2, Layers } from 'lucide-react'
import { Card, CardTitle, Button, Badge, Progress } from '@/components/ui'
import { LanguageBadge } from '@/components/shared/LanguageBadge'
import { EmptyState } from '@/components/feedback/EmptyState'
import { formatDuration } from '@/utils/formatters'

interface BatchJob {
  id: string
  videoTitle: string
  duration: number
  languages: string[]
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  priority: 'normal' | 'high' | 'rush'
}

const initialJobs: BatchJob[] = [
  {
    id: '1',
    videoTitle: 'How I Built a $1M SaaS in 6 Months',
    duration: 845,
    languages: ['es', 'pt-BR', 'ja', 'ko', 'fr'],
    status: 'processing',
    progress: 72,
    priority: 'high',
  },
  {
    id: '2',
    videoTitle: 'React 20 New Features Explained',
    duration: 1230,
    languages: ['es', 'hi', 'pt-BR', 'ja', 'ko', 'de', 'zh'],
    status: 'processing',
    progress: 34,
    priority: 'normal',
  },
  {
    id: '3',
    videoTitle: 'Day in the Life of a Software Engineer',
    duration: 620,
    languages: ['es', 'ko', 'ja'],
    status: 'queued',
    progress: 0,
    priority: 'normal',
  },
  {
    id: '4',
    videoTitle: 'Ultimate Productivity Setup 2026',
    duration: 980,
    languages: ['es', 'hi', 'pt-BR', 'fr', 'de', 'ar', 'id', 'zh'],
    status: 'queued',
    progress: 0,
    priority: 'rush',
  },
]

const priorityConfig = {
  normal: { label: '보통', variant: 'default' as const },
  high: { label: '높음', variant: 'warning' as const },
  rush: { label: '긴급', variant: 'error' as const },
}

const statusConfig = {
  queued: { label: '대기 중', variant: 'default' as const },
  processing: { label: '처리 중', variant: 'brand' as const },
  completed: { label: '완료', variant: 'success' as const },
  failed: { label: '실패', variant: 'error' as const },
}

export default function BatchPage() {
  const [jobs, setJobs] = useState<BatchJob[]>(initialJobs)

  const removeJob = (id: string) => setJobs(jobs.filter((j) => j.id !== id))

  if (jobs.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">배치 큐</h1>
          <p className="text-surface-500 dark:text-surface-400">여러 영상을 더빙 큐에 추가하세요</p>
        </div>
        <EmptyState
          icon={<Layers className="h-12 w-12" />}
          title="큐에 작업이 없습니다"
          description="배치 큐에 영상을 추가하면 여러 더빙 작업을 한 번에 처리할 수 있습니다."
          action={
            <Link href="/dubbing">
              <Button><Plus className="h-4 w-4" /> 새 더빙</Button>
            </Link>
          }
        />
      </div>
    )
  }

  const processing = jobs.filter((j) => j.status === 'processing').length
  const queued = jobs.filter((j) => j.status === 'queued').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">배치 큐</h1>
          <p className="text-surface-500 dark:text-surface-400">
            {processing} 처리 중 · {queued} 대기 중
          </p>
        </div>
        <Link href="/dubbing">
          <Button><Plus className="h-4 w-4" /> 영상 추가</Button>
        </Link>
      </div>

      <Card>
        <CardTitle>큐 ({jobs.length}개 작업)</CardTitle>

        <div className="mt-4 space-y-2">
          {jobs.map((job) => {
            const priority = priorityConfig[job.priority]
            const status = statusConfig[job.status]
            return (
              <div
                key={job.id}
                className="flex items-center gap-3 rounded-lg border border-surface-200 p-3 transition-colors hover:bg-surface-50 dark:border-surface-800 dark:hover:bg-surface-800/50"
              >
                <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-surface-300" />

                {/* Thumbnail placeholder */}
                <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded-md bg-surface-200 text-xs text-surface-400 dark:bg-surface-800">
                  {formatDuration(job.duration)}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-surface-900 dark:text-white">
                    {job.videoTitle}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {job.languages.slice(0, 3).map((lang) => (
                      <LanguageBadge key={lang} code={lang} />
                    ))}
                    {job.languages.length > 3 && (
                      <span className="text-xs text-surface-400">+{job.languages.length - 3}</span>
                    )}
                  </div>
                </div>

                {/* Status & Priority */}
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <div className="flex gap-1.5">
                    <Badge variant={priority.variant}>{priority.label}</Badge>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  {job.status === 'processing' && (
                    <Progress value={job.progress} size="sm" className="w-24" />
                  )}
                </div>

                <button
                  onClick={() => removeJob(job.id)}
                  className="shrink-0 rounded-md p-1.5 text-surface-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
