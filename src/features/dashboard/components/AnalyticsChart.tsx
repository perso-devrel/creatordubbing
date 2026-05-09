'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardTitle } from '@/components/ui'
import { useQuery } from '@tanstack/react-query'
import { ytFetchAnalytics } from '@/lib/api-client'
import { useAuthStore } from '@/stores/authStore'
import { useMemo, useState } from 'react'
import { useLocaleText } from '@/hooks/useLocaleText'

export function AnalyticsChart({ videoIds }: { videoIds?: string[] }) {
  const t = useLocaleText()
  const user = useAuthStore((s) => s.user)
  const [tab, setTab] = useState<'daily' | 'country'>('daily')

  const { data, isLoading } = useQuery({
    queryKey: ['youtube-analytics', videoIds],
    queryFn: () => ytFetchAnalytics(videoIds ?? []),
    enabled: !!user && !!videoIds && videoIds.length > 0,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60,
  })

  const mergedDaily = useMemo(() => {
    const allDaily = (data || []).flatMap((v) => v.daily)
    return Object.values(
      allDaily.reduce<Record<string, { date: string; views: number; minutes: number }>>(
        (acc, row) => {
          const existing = acc[row.date] || { date: row.date, views: 0, minutes: 0 }
          existing.views += row.views
          existing.minutes += row.estimatedMinutesWatched
          acc[row.date] = existing
          return acc
        },
        {},
      ),
    ).sort((a, b) => a.date.localeCompare(b.date))
  }, [data])

  const mergedCountries = useMemo(() => {
    return Object.values(
      (data || [])
        .flatMap((v) => v.countries)
        .reduce<Record<string, { country: string; views: number; minutes: number }>>(
          (acc, row) => {
            const existing = acc[row.country] || { country: row.country, views: 0, minutes: 0 }
            existing.views += row.views
            existing.minutes += row.estimatedMinutesWatched
            acc[row.country] = existing
            return acc
          },
          {},
        ),
    )
      .sort((a, b) => b.views - a.views)
      .slice(0, 10)
  }, [data])

  if (!videoIds || videoIds.length === 0) {
    return (
      <Card>
        <CardTitle>{t({ ko: '시청 분석', en: 'Viewer analytics' })}</CardTitle>
        <p className="text-sm text-surface-500 dark:text-surface-400">
          {t({ ko: 'YouTube에 업로드된 영상이 없습니다.', en: 'No videos have been uploaded to YouTube yet.' })}
        </p>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardTitle>{t({ ko: '시청 분석', en: 'Viewer analytics' })}</CardTitle>
        <div className="mt-4 h-64 animate-pulse rounded bg-surface-100 dark:bg-surface-800" />
      </Card>
    )
  }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <CardTitle>{t({ ko: '시청 분석', en: 'Viewer analytics' })}</CardTitle>
        <div className="flex gap-1 rounded-lg bg-surface-100 p-1 dark:bg-surface-800" role="tablist">
          <button
            role="tab"
            aria-selected={tab === 'daily'}
            onClick={() => setTab('daily')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors focus-ring ${
              tab === 'daily'
                ? 'bg-white text-surface-900 shadow-sm dark:bg-surface-700 dark:text-white'
                : 'text-surface-500 hover:text-surface-700 dark:text-surface-400'
            }`}
          >
            {t({ ko: '일별', en: 'Daily' })}
          </button>
          <button
            role="tab"
            aria-selected={tab === 'country'}
            onClick={() => setTab('country')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors focus-ring ${
              tab === 'country'
                ? 'bg-white text-surface-900 shadow-sm dark:bg-surface-700 dark:text-white'
                : 'text-surface-500 hover:text-surface-700 dark:text-surface-400'
            }`}
          >
            {t({ ko: '국가별', en: 'By country' })}
          </button>
        </div>
      </div>

      <div className="h-64 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          {tab === 'daily' ? (
            <BarChart data={mergedDaily} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#a1a1aa' }}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a1a1aa' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #3f3f46',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '13px',
                }}
                formatter={(value, name) => [
                  Number(value).toLocaleString(),
                  name === 'views' ? t({ ko: '조회수', en: 'Views' }) : t({ ko: '시청 시간(분)', en: 'Watch time (min)' }),
                ]}
                labelFormatter={(label) => String(label)}
              />
              <Bar dataKey="views" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <BarChart
              data={mergedCountries}
              layout="vertical"
              margin={{ top: 5, right: 5, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a1a1aa' }} />
              <YAxis
                type="category"
                dataKey="country"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#a1a1aa' }}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #3f3f46',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '13px',
                }}
                formatter={(value, name) => [
                  Number(value).toLocaleString(),
                  name === 'views' ? t({ ko: '조회수', en: 'Views' }) : t({ ko: '시청 시간(분)', en: 'Watch time (min)' }),
                ]}
              />
              <Bar dataKey="views" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
