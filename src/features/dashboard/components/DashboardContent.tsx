'use client'

import dynamic from 'next/dynamic'
import { DashboardSummary } from './DashboardSummary'
import { QuickStart } from './QuickStart'
import { RecentJobs } from './RecentJobs'
import { Card } from '@/components/ui'
import type { DashboardInitialData } from './types'

function ChartSkeleton() {
  return (
    <Card>
      <div className="h-8 w-32 animate-pulse rounded bg-surface-200 dark:bg-surface-700" />
      <div className="mt-2 h-4 w-48 animate-pulse rounded bg-surface-100 dark:bg-surface-800" />
      <div className="mt-4 h-64 animate-pulse rounded bg-surface-100 dark:bg-surface-800" />
    </Card>
  )
}

const CreditChart = dynamic(
  () => import('./CreditChart').then((m) => m.CreditChart),
  { ssr: false, loading: () => <ChartSkeleton /> },
)

const LanguagePerformance = dynamic(
  () => import('./LanguagePerformance').then((m) => m.LanguagePerformance),
  { ssr: false, loading: () => <ChartSkeleton /> },
)

const AnalyticsChart = dynamic(
  () => import('./AnalyticsChart').then((m) => m.AnalyticsChart),
  { ssr: false, loading: () => <ChartSkeleton /> },
)

export function DashboardContent({ initial }: { initial: DashboardInitialData }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">대시보드</h1>
        <p className="text-surface-500 dark:text-surface-400">돌아오신 것을 환영합니다! 더빙 현황을 확인하세요.</p>
      </div>

      <DashboardSummary initialData={initial.summary} />
      <QuickStart />

      <div className="grid gap-6 lg:grid-cols-2">
        <CreditChart initialData={initial.creditUsage} />
        <LanguagePerformance />
      </div>

      <AnalyticsChart videoIds={initial.ytVideoIds} />

      <RecentJobs initialData={initial.jobs} />
    </div>
  )
}
