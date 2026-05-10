'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardTitle } from '@/components/ui'
import { formatNumber } from '@/utils/formatters'
import { useLanguagePerformance } from '@/hooks/useDashboardData'
import { getLanguageByCode } from '@/utils/languages'
import { useLocaleText } from '@/hooks/useLocaleText'

const COLORS = ['#cc0000', '#e62117', '#ff5f52', '#ff9f96', '#ffc8c3', '#a90000', '#870000', '#620000']

export function LanguagePerformance() {
  const t = useLocaleText()
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
        <CardTitle>{t('features.dashboard.components.languagePerformance.languagePerformance')}</CardTitle>
        <p className="mb-4 text-sm text-surface-500 dark:text-surface-400">{t('features.dashboard.components.languagePerformance.viewsByDubbingLanguage')}</p>
        <div className="flex h-64 items-center justify-center text-center text-sm text-surface-500 dark:text-surface-300">
          {t('features.dashboard.components.languagePerformance.performanceAppearsHereAfterYouUploadVideosTo')}
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <CardTitle>{t('features.dashboard.components.languagePerformance.languagePerformance2')}</CardTitle>
      <p className="mb-4 text-sm text-surface-500 dark:text-surface-400">{t('features.dashboard.components.languagePerformance.viewsByDubbingLanguage2')}</p>

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
              formatter={(value) => [formatNumber(Number(value)), t('features.dashboard.components.languagePerformance.views')]}
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
