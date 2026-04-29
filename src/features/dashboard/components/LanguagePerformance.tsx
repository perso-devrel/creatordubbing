'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardTitle } from '@/components/ui'
import { formatNumber } from '@/utils/formatters'
import { useLanguagePerformance } from '@/hooks/useDashboardData'
import { getLanguageByCode } from '@/utils/languages'

const COLORS = ['#f43f5e', '#fb7185', '#fda4af', '#fecdd3', '#ffe4e6', '#fda4af', '#fb7185', '#f43f5e']

export function LanguagePerformance() {
  const { data: rawData } = useLanguagePerformance()

  const chartData = (rawData || []).map((r) => {
    const lang = getLanguageByCode(r.language_code)
    return {
      language: lang?.name || r.language_code,
      views: Number(r.total_views) || 0,
      flag: lang?.flag || '',
    }
  })

  if (chartData.length === 0) {
    return (
      <Card>
        <CardTitle>언어별 성과</CardTitle>
        <p className="mb-4 text-sm text-surface-500 dark:text-surface-400">더빙 언어별 조회수</p>
        <div className="flex h-64 items-center justify-center text-sm text-surface-400">
          YouTube에 업로드한 영상이 있으면 여기에 성과가 표시됩니다
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <CardTitle>언어별 성과</CardTitle>
      <p className="mb-4 text-sm text-surface-500 dark:text-surface-400">더빙 언어별 조회수</p>

      <div className="h-64 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} horizontal={false} />
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a1a1aa' }} tickFormatter={(v) => formatNumber(v)} />
            <YAxis
              dataKey="language" type="category" axisLine={false} tickLine={false}
              tick={{ fontSize: 12, fill: '#a1a1aa' }} width={80}
              tickFormatter={(v, i) => `${chartData[i]?.flag || ''} ${v}`}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff', fontSize: '13px' }}
              formatter={(value) => [formatNumber(Number(value)), '조회수']}
            />
            <Bar dataKey="views" radius={[0, 4, 4, 0]} barSize={20}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
