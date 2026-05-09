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
      label: t({ ko: '더빙된 영상', en: 'Dubbed videos' }),
      value: data ? Number(data.total_jobs) : 0,
      icon: Film,
      color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: t({ ko: '총 시간(분)', en: 'Total minutes' }),
      value: data ? Number(data.total_minutes) : 0,
      icon: Clock,
      color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      label: t({ ko: '남은 더빙 시간', en: 'Remaining minutes' }),
      value: data ? Number(data.credits_remaining) : 0,
      icon: Coins,
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
    },
    {
      label: t({ ko: '진행 중', en: 'In progress' }),
      value: data ? Number(data.active_jobs) : 0,
      icon: Zap,
      color: 'text-brand-500 bg-brand-50 dark:bg-brand-900/20',
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, color }) => (
        <Card key={label} className="flex items-center gap-4">
          <div className={`rounded-xl p-3 ${color}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-surface-500 dark:text-surface-400">{label}</p>
            <p className="whitespace-nowrap text-2xl font-bold text-surface-900 dark:text-white">{value}</p>
          </div>
        </Card>
      ))}
    </div>
  )
}
