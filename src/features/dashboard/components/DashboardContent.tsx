'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { DashboardSummary } from './DashboardSummary'
import { QuickStart } from './QuickStart'
import { RecentJobs } from './RecentJobs'
import { Card } from '@/components/ui'
import { useLocaleText } from '@/hooks/useLocaleText'
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

function LazyChart({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (isReady) return

    const node = ref.current
    if (!node) return
    if (!('IntersectionObserver' in window)) {
      const id = globalThis.setTimeout(() => setIsReady(true), 0)
      return () => globalThis.clearTimeout(id)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsReady(true)
          observer.disconnect()
        }
      },
      { rootMargin: '240px 0px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [isReady])

  return (
    <div ref={ref}>
      {isReady ? children : <ChartSkeleton />}
    </div>
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
  const t = useLocaleText()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">{t('features.dashboard.components.dashboardContent.dashboard')}</h1>
        <p className="text-surface-600 dark:text-surface-400">{t('features.dashboard.components.dashboardContent.reviewRecentDubbingUploadsAndMinuteUsage')}</p>
      </div>

      <DashboardSummary initialData={initial.summary} />
      <QuickStart />

      <div className="grid gap-6 lg:grid-cols-2">
        <LazyChart>
          <CreditChart initialData={initial.creditUsage} />
        </LazyChart>
        <LazyChart>
          <LanguagePerformance />
        </LazyChart>
      </div>

      <LazyChart>
        <AnalyticsChart videoIds={initial.ytVideoIds} />
      </LazyChart>

      <RecentJobs initialData={initial.jobs} />
    </div>
  )
}
