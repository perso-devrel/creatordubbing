'use client'

import Link from 'next/link'
import { Card, CardTitle, Badge, Progress } from '@/components/ui'
import { LanguageBadge } from '@/components/shared/LanguageBadge'
import { formatDuration } from '@/utils/formatters'
import { useRecentJobs } from '@/hooks/useDashboardData'
import { EmptyState } from '@/components/feedback/EmptyState'
import { Languages } from 'lucide-react'
import { useLocaleText } from '@/hooks/useLocaleText'
import type { DubbingJob } from './types'

const statusConfig: Record<string, { label: { ko: string; en: string }; variant: 'success' | 'brand' | 'default' | 'error' }> = {
  completed: { label: { ko: '완료', en: 'Complete' }, variant: 'success' },
  processing: { label: { ko: '처리 중', en: 'Processing' }, variant: 'brand' },
  pending: { label: { ko: '대기 중', en: 'Pending' }, variant: 'default' },
  queued: { label: { ko: '대기 중', en: 'Queued' }, variant: 'default' },
  failed: { label: { ko: '실패', en: 'Failed' }, variant: 'error' },
}

interface RecentJobsProps {
  initialData?: DubbingJob[]
}

export function RecentJobs({ initialData }: RecentJobsProps) {
  const t = useLocaleText()
  const { data: jobs } = useRecentJobs(initialData)

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <CardTitle>{t({ ko: '최근 작업', en: 'Recent jobs' })}</CardTitle>
        <Link href="/batch" aria-label={t({ ko: '최근 작업 전체 보기', en: 'View all recent jobs' })} className="text-sm text-brand-500 hover:text-brand-600">{t({ ko: '전체 보기', en: 'View all' })}</Link>
      </div>

      {!jobs || jobs.length === 0 ? (
        <EmptyState
          icon={<Languages className="h-8 w-8" />}
          title={t({ ko: '아직 더빙 작업이 없습니다', en: 'No dubbing jobs yet' })}
          description={t({ ko: '새 더빙을 시작하세요.', en: 'Start a new dubbing job.' })}
        />
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const status = statusConfig[job.status] || statusConfig.pending
            const languages = (job.languages || '').split(',').filter(Boolean)
            const avgProgress = Number(job.avg_progress) || 0

            return (
              <div
                key={job.id}
                className="flex flex-col gap-3 rounded-lg border border-surface-100 p-3 dark:border-surface-800 sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded-md bg-surface-200 text-xs text-surface-500 dark:bg-surface-800 dark:text-surface-300">
                  {formatDuration(job.video_duration_ms / 1000)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-surface-900 dark:text-white">
                    {job.video_title}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {languages.slice(0, 4).map((lang) => (
                      <LanguageBadge key={lang} code={lang} />
                    ))}
                    {languages.length > 4 && (
                      <span className="text-xs text-surface-500 dark:text-surface-300">+{languages.length - 4}</span>
                    )}
                  </div>
                </div>
                <div className="flex w-full shrink-0 items-center justify-between gap-2 sm:w-auto sm:block sm:text-right">
                  <Badge variant={status.variant}>{t(status.label)}</Badge>
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
