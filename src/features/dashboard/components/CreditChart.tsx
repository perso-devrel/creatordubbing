'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardTitle } from '@/components/ui'
import { useCreditUsage } from '@/hooks/useDashboardData'
import type { CreditUsageRow } from './types'

// Fallback data when DB has no data yet
const fallbackData = [
  { month: '2026-01', used: 0 },
  { month: '2026-02', used: 0 },
  { month: '2026-03', used: 0 },
  { month: '2026-04', used: 0 },
]

interface CreditChartProps {
  initialData?: CreditUsageRow[]
}

export function CreditChart({ initialData }: CreditChartProps) {
  const { data: rawData } = useCreditUsage(initialData)

  const chartData = rawData && rawData.length > 0
    ? rawData.map((r) => ({
        month: r.month.slice(5),
        used: Number(r.minutes_used) || 0,
      })).reverse()
    : fallbackData.map((d) => ({ month: d.month.slice(5), used: d.used }))

  return (
    <Card>
      <CardTitle>크레딧 사용량</CardTitle>
      <p className="mb-4 text-sm text-surface-500 dark:text-surface-400">월별 크레딧 소비 현황</p>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="creditGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a1a1aa' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a1a1aa' }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff', fontSize: '13px' }}
              formatter={(value) => [`${Number(value)} credits`, '사용']}
            />
            <Area type="monotone" dataKey="used" stroke="#f43f5e" strokeWidth={2} fill="url(#creditGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
