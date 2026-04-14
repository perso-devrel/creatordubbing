import 'server-only'

import type {
  AnalyticsCountryRow,
  AnalyticsDailyRow,
  VideoAnalytics,
} from '@/lib/youtube/types'
import { YouTubeError } from '@/lib/youtube/error'

const ANALYTICS_API_BASE = 'https://youtubeanalytics.googleapis.com/v2/reports'

interface AnalyticsApiResponse {
  columnHeaders?: Array<{ name: string }>
  rows?: Array<Array<string | number>>
}

async function queryAnalytics(
  accessToken: string,
  params: Record<string, string>,
): Promise<AnalyticsApiResponse> {
  const qs = new URLSearchParams({ ids: 'channel==MINE', ...params })
  const res = await fetch(`${ANALYTICS_API_BASE}?${qs}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new YouTubeError(
      res.status,
      `YouTube Analytics query failed: ${err}`,
      'ANALYTICS_FAILED',
    )
  }
  return res.json() as Promise<AnalyticsApiResponse>
}

export async function fetchVideoAnalytics(
  accessToken: string,
  videoId: string,
  startDate: string,
  endDate: string,
): Promise<VideoAnalytics> {
  const [dailyData, countryData] = await Promise.all([
    queryAnalytics(accessToken, {
      startDate,
      endDate,
      metrics: 'views,estimatedMinutesWatched,averageViewDuration',
      dimensions: 'day',
      filters: `video==${videoId}`,
      sort: 'day',
    }),
    queryAnalytics(accessToken, {
      startDate,
      endDate,
      metrics: 'views,estimatedMinutesWatched',
      dimensions: 'country',
      filters: `video==${videoId}`,
      sort: '-views',
    }),
  ])

  const daily: AnalyticsDailyRow[] = (dailyData.rows || []).map((row) => ({
    date: String(row[0]),
    views: Number(row[1]),
    estimatedMinutesWatched: Number(row[2]),
    averageViewDuration: Number(row[3]),
  }))

  const countries: AnalyticsCountryRow[] = (countryData.rows || []).map(
    (row) => ({
      country: String(row[0]),
      views: Number(row[1]),
      estimatedMinutesWatched: Number(row[2]),
    }),
  )

  const totals = daily.reduce(
    (acc, d) => ({
      views: acc.views + d.views,
      estimatedMinutesWatched:
        acc.estimatedMinutesWatched + d.estimatedMinutesWatched,
      averageViewDuration: 0,
    }),
    { views: 0, estimatedMinutesWatched: 0, averageViewDuration: 0 },
  )
  if (daily.length > 0) {
    totals.averageViewDuration =
      daily.reduce((s, d) => s + d.averageViewDuration, 0) / daily.length
  }

  return { videoId, daily, countries, totals }
}

export async function fetchMultiVideoAnalytics(
  accessToken: string,
  videoIds: string[],
  startDate: string,
  endDate: string,
): Promise<VideoAnalytics[]> {
  return Promise.all(
    videoIds.map((id) =>
      fetchVideoAnalytics(accessToken, id, startDate, endDate),
    ),
  )
}
