'use client'

import { Film, Clock, Coins, Zap } from 'lucide-react'
import { Card } from '@/components/ui'
import { useDashboardSummary } from '@/hooks/useDashboardData'
import { useLocaleText } from '@/hooks/useLocaleText'
import type { DashboardSummary as DashboardSummaryType } from './types'

interface DashboardSummaryProps {
  initialData?: DashboardSummaryType | null
}

export function DashboardSummary({ initialData }: DashboardSummaryProps) {
  const t = useLocaleText()
  const { data } = useDashboardSummary(initialData ?? undefined)

  const cards = [
    {
      label: t('features.dashboard.components.dashboardSummary.dubbedVideos'),
      value: data ? Number(data.total_jobs) : 0,
      icon: Film,
      color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: t('features.dashboard.components.dashboardSummary.totalMinutes'),
      value: data ? Number(data.total_minutes) : 0,
      icon: Clock,
      color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      label: t('features.dashboard.components.dashboardSummary.remainingMinutes'),
      value: data ? Number(data.credits_remaining) : 0,
      icon: Coins,
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
    },
    {
      label: t('features.dashboard.components.dashboardSummary.inProgress'),
      value: data ? Number(data.active_jobs) : 0,
      icon: Zap,
      color: 'text-brand-500 bg-brand-50 dark:bg-brand-900/20',
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, color }) => (
        <Card key={label} className="flex items-start justify-between gap-4 p-4">
          <div>
            <p className="text-sm font-medium text-surface-500 dark:text-surface-400">{label}</p>
            <p className="mt-2 whitespace-nowrap text-3xl font-semibold leading-none text-surface-950 dark:text-white">{value}</p>
          </div>
          <div className={`rounded-md p-2.5 ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </Card>
      ))}
    </div>
  )
}
