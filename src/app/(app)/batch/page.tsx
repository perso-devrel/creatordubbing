'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, GripVertical, Layers, Loader2, Trash2 } from 'lucide-react'
import { Card, CardTitle, Button, Badge, Progress } from '@/components/ui'
import { LanguageBadge } from '@/components/shared/LanguageBadge'
import { EmptyState } from '@/components/feedback/EmptyState'
import { formatDuration } from '@/utils/formatters'
import { useRecentJobs } from '@/hooks/useDashboardData'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { dbMutation } from '@/lib/api/dbMutation'

const statusConfig = {
  processing: { label: '처리 중', variant: 'brand' as const },
  completed: { label: '완료', variant: 'success' as const },
  failed: { label: '실패', variant: 'error' as const },
  queued: { label: '대기 중', variant: 'default' as const },
}

export default function BatchPage() {
  const { data: jobs = [], isLoading } = useRecentJobs()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const handleDeleteJob = async (jobId: number) => {
    if (deletingId === jobId) return
    const ok = window.confirm(
      '이 작업을 큐에서 삭제하시겠습니까?\n진행 중인 Perso 더빙도 함께 취소됩니다.',
    )
    if (!ok) return

    setDeletingId(jobId)
    queryClient.setQueryData(['recent-jobs', user?.uid], (old: typeof jobs) =>
      old ? old.filter((j) => j.id !== jobId) : old,
    )
    try {
      await dbMutation({ type: 'deleteDubbingJob', payload: { jobId } })
    } finally {
      setDeletingId(null)
      queryClient.invalidateQueries({ queryKey: ['recent-jobs'] })
    }
  }

  // Auto-complete stale jobs where avg_progress hit 100 but DB still shows 'processing'
  useEffect(() => {
    if (!user || jobs.length === 0) return
    const stale = jobs.filter(
      (j) => j.status === 'processing' && Number(j.avg_progress) >= 100,
    )
    if (stale.length === 0) return

    Promise.all(
      stale.map((j) =>
        dbMutation({ type: 'updateJobStatus', payload: { jobId: j.id, status: 'completed' } }),
      ),
    ).then(() => {
      queryClient.invalidateQueries({ queryKey: ['recent-jobs'] })
    })
  }, [jobs, user, queryClient])

  const activeJobs = jobs.filter(
    (j) => (j.status === 'processing' || j.status === 'queued') && Number(j.avg_progress) < 100,
  )
  const processing = activeJobs.filter((j) => j.status === 'processing').length
  const queued = activeJobs.filter((j) => j.status === 'queued').length

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">배치 큐</h1>
          <p className="text-surface-500 dark:text-surface-400">여러 영상을 더빙 큐에 추가하세요</p>
        </div>
        <div className="flex items-center gap-2 text-surface-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">불러오는 중...</span>
        </div>
      </div>
    )
  }

  if (activeJobs.length === 0) {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">배치 큐</h1>
          <p className="text-surface-500 dark:text-surface-400">
            {processing > 0 && `${processing} 처리 중`}
            {processing > 0 && queued > 0 && ' · '}
            {queued > 0 && `${queued} 대기 중`}
          </p>
        </div>
        <Link href="/dubbing">
          <Button><Plus className="h-4 w-4" /> 영상 추가</Button>
        </Link>
      </div>

      <Card>
        <CardTitle>큐 ({activeJobs.length}개 작업)</CardTitle>

        <div className="mt-4 space-y-2">
          {activeJobs.map((job) => {
            const langList = job.languages
              ? String(job.languages).split(',').filter(Boolean)
              : []
            const progress = Math.round(Number(job.avg_progress) || 0)
            const status = statusConfig[job.status as keyof typeof statusConfig] ?? statusConfig.queued

            return (
              <div
                key={job.id}
                className="flex items-center gap-3 rounded-lg border border-surface-200 p-3 transition-colors hover:bg-surface-50 dark:border-surface-800 dark:hover:bg-surface-800/50"
              >
                <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-surface-300" />

                <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded-md bg-surface-200 text-xs text-surface-400 dark:bg-surface-800">
                  {formatDuration(Math.round(job.video_duration_ms / 1000))}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-surface-900 dark:text-white">
                    {job.video_title}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {langList.slice(0, 3).map((lang) => (
                      <LanguageBadge key={lang} code={lang} />
                    ))}
                    {langList.length > 3 && (
                      <span className="text-xs text-surface-400">+{langList.length - 3}</span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <Badge variant={status.variant}>{status.label}</Badge>
                  {job.status === 'processing' && (
                    <Progress value={progress} size="sm" className="w-24" />
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteJob(job.id)}
                  disabled={deletingId === job.id}
                  aria-label="작업 삭제"
                  className={`shrink-0 rounded-md p-1.5 transition-colors ${
                    deletingId === job.id
                      ? 'cursor-not-allowed text-surface-300'
                      : 'text-surface-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20'
                  }`}
                  title={deletingId === job.id ? '삭제 중...' : '작업 삭제 (Perso 처리도 함께 취소)'}
                >
                  {deletingId === job.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
