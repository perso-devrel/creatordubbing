'use client'

import { DashboardSummary } from '@/features/dashboard/components/DashboardSummary'
import { QuickStart } from '@/features/dashboard/components/QuickStart'
import { RecentJobs } from '@/features/dashboard/components/RecentJobs'
import { CreditChart } from '@/features/dashboard/components/CreditChart'
import { LanguagePerformance } from '@/features/dashboard/components/LanguagePerformance'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">대시보드</h1>
        <p className="text-surface-500 dark:text-surface-400">돌아오신 것을 환영합니다! 더빙 현황을 확인하세요.</p>
      </div>

      <DashboardSummary />
      <QuickStart />

      <div className="grid gap-6 lg:grid-cols-2">
        <CreditChart />
        <LanguagePerformance />
      </div>

      <RecentJobs />
    </div>
  )
}
