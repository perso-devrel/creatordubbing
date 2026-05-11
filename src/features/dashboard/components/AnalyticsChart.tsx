'use client'

import { Card, CardTitle } from '@/components/ui'
import { useQuery } from '@tanstack/react-query'
import { ytFetchAnalytics } from '@/lib/api-client'
import { useAuthStore } from '@/stores/authStore'
import { useMemo, useState } from 'react'
import { useLocaleText } from '@/hooks/useLocaleText'

function BarSeries({
  data,
  xKey,
  yKey,
  color,
  formatLabel,
}: {
  data: Array<Record<string, string | number>>
  xKey: string
  yKey: string
  color: string
  formatLabel?: (value: string) => string
}) {
  const maxValue = Math.max(1, ...data.map((row) => Number(row[yKey]) || 0))
  const barWidth = data.length > 0 ? 100 / data.length : 100

  return (
    <div className="h-64 w-full min-w-0">
      <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible text-surface-200 dark:text-surface-800" preserveAspectRatio="none">
        {[25, 50, 75, 100].map((y) => (
          <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="currentColor" strokeWidth="0.35" vectorEffect="non-scaling-stroke" />
        ))}
        {data.map((row, index) => {
          const value = Number(row[yKey]) || 0
          const height = (value / maxValue) * 86
          const x = index * barWidth + barWidth * 0.2
          const y = 100 - height
          return (
            <rect
              key={`${row[xKey]}-${index}`}
              x={x}
              y={y}
              width={barWidth * 0.6}
              height={height}
              rx="1.4"
              fill={color}
              vectorEffect="non-scaling-stroke"
            >
              <title>{`${row[xKey]}: ${value.toLocaleString()}`}</title>
            </rect>
          )
        })}
      </svg>
      <div className="mt-2 flex justify-between gap-2 text-[11px] text-surface-500 dark:text-surface-400">
        {data.map((row, index) => (
          <span key={`${row[xKey]}-${index}`} className="min-w-0 truncate">
            {formatLabel ? formatLabel(String(row[xKey])) : String(row[xKey])}
          </span>
        ))}
      </div>
    </div>
  )
}

function HorizontalBarSeries({
  data,
  labelKey,
  valueKey,
  color,
}: {
  data: Array<Record<string, string | number>>
  labelKey: string
  valueKey: string
  color: string
}) {
  const maxValue = Math.max(1, ...data.map((row) => Number(row[valueKey]) || 0))

  return (
    <div className="h-64 w-full min-w-0 space-y-3 overflow-hidden">
      {data.map((row) => {
        const value = Number(row[valueKey]) || 0
        const width = Math.max(4, (value / maxValue) * 100)
        return (
          <div key={String(row[labelKey])} className="grid grid-cols-[3rem_1fr_4.5rem] items-center gap-3">
            <div className="truncate text-xs font-medium text-surface-600 dark:text-surface-300">
              {row[labelKey]}
            </div>
            <div className="h-5 rounded-full bg-surface-100 dark:bg-surface-800">
              <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: color }} />
            </div>
            <div className="text-right text-xs font-medium text-surface-700 dark:text-surface-200">
              {value.toLocaleString()}
            </div>
          </div>
        )
      })}
    </div>
  )
}

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
        <CardTitle>{t('features.dashboard.components.analyticsChart.viewerAnalytics')}</CardTitle>
        <p className="text-sm text-surface-500 dark:text-surface-400">
          {t('features.dashboard.components.analyticsChart.noVideosHaveBeenUploadedToYouTubeYet')}
        </p>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardTitle>{t('features.dashboard.components.analyticsChart.viewerAnalytics2')}</CardTitle>
        <div className="mt-4 h-64 animate-pulse rounded bg-surface-100 dark:bg-surface-800" />
      </Card>
    )
  }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <CardTitle>{t('features.dashboard.components.analyticsChart.viewerAnalytics3')}</CardTitle>
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
            {t('features.dashboard.components.analyticsChart.daily')}
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
            {t('features.dashboard.components.analyticsChart.byCountry')}
          </button>
        </div>
      </div>

      {tab === 'daily' ? (
        <BarSeries
          data={mergedDaily}
          xKey="date"
          yKey="views"
          color="#3b82f6"
          formatLabel={(value) => value.slice(5)}
        />
      ) : (
        <HorizontalBarSeries
          data={mergedCountries}
          labelKey="country"
          valueKey="views"
          color="#8b5cf6"
        />
      )}
    </Card>
  )
}
