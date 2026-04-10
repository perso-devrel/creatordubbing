'use client'

import Link from 'next/link'
import { Card, CardTitle, Badge, Progress } from '@/components/ui'
import { LanguageBadge } from '@/components/shared/LanguageBadge'
import { formatDuration } from '@/utils/formatters'
import { useRecentJobs } from '@/hooks/useDashboardData'
import { EmptyState } from '@/components/feedback/EmptyState'
import { Languages } from 'lucide-react'

const statusConfig: Record<string, { label: string; variant: 'success' | 'brand' | 'default' | 'error' }> = {
  completed: { label: '완료', variant: 'success' },
  processing: { label: '처리 중', variant: 'brand' },
  pending: { label: '대기 중', variant: 'default' },
  failed: { label: '실패', variant: 'error' },
}

export function RecentJobs() {
  const { data: jobs } = useRecentJobs()

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <CardTitle>최근 작업</CardTitle>
        <Link href="/batch" className="text-sm text-brand-500 hover:text-brand-600">전체 보기</Link>
      </div>

      {!jobs || jobs.length === 0 ? (
        <EmptyState
          icon={<Languages className="h-8 w-8" />}
          title="아직 더빙 작업이 없습니다"
          description="새 더빙을 시작해보세요!"
        />
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const status = statusConfig[job.status as string] || statusConfig.pending
            const languages = ((job.languages as string) || '').split(',').filter(Boolean)
            const avgProgress = Number(job.avg_progress) || 0

            return (
              <div
                key={job.id as number}
                className="flex items-center gap-4 rounded-lg border border-surface-100 p-3 transition-colors hover:bg-surface-50 dark:border-surface-800 dark:hover:bg-surface-800/50"
              >
                <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded-md bg-surface-200 text-xs text-surface-400 dark:bg-surface-800">
                  {formatDuration(Number(job.video_duration_ms) / 1000)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-surface-900 dark:text-white">
                    {job.video_title as string}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {languages.slice(0, 4).map((lang) => (
                      <LanguageBadge key={lang} code={lang} />
                    ))}
                    {languages.length > 4 && (
                      <span className="text-xs text-surface-400">+{languages.length - 4}</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <Badge variant={status.variant}>{status.label}</Badge>
                  {job.status === 'processing' && (
                    <Progress value={avgProgress} size="sm" className="mt-2 w-24" />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
