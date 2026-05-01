import 'server-only'

import type { ChannelStats, MyVideoItem, VideoStats } from '@/lib/youtube/types'
import { YouTubeError } from '@/lib/youtube/error'

const YOUTUBE_API_BASE = 'https://www.googleapis.com'

export async function fetchVideoStatistics(
  accessToken: string,
  videoIds: string[],
): Promise<VideoStats[]> {
  if (videoIds.length === 0) return []

  const ids = videoIds.join(',')
  const res = await fetch(
    `${YOUTUBE_API_BASE}/youtube/v3/videos?part=statistics&id=${ids}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!res.ok) {
    throw new YouTubeError(
      res.status,
      'YouTube 영상 통계 가져오기 실패',
      'STATS_FAILED',
    )
  }

  const data = (await res.json()) as {
    items?: Array<{ id: string; statistics?: Record<string, string> }>
  }
  return (data.items || []).map((item) => ({
    videoId: item.id,
    viewCount: parseInt(item.statistics?.viewCount || '0', 10),
    likeCount: parseInt(item.statistics?.likeCount || '0', 10),
    commentCount: parseInt(item.statistics?.commentCount || '0', 10),
  }))
}

export async function fetchChannelStatistics(
  accessToken: string,
): Promise<ChannelStats | null> {
  const res = await fetch(
    `${YOUTUBE_API_BASE}/youtube/v3/channels?part=statistics,snippet&mine=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new YouTubeError(
      res.status,
      `Channel fetch failed: ${body}`,
      'CHANNEL_FETCH_FAILED',
    )
  }

  const data = (await res.json()) as {
    items?: Array<{
      id: string
      snippet?: {
        title?: string
        thumbnails?: { default?: { url?: string } }
      }
      statistics?: Record<string, string>
    }>
  }
  const channel = data.items?.[0]
  if (!channel) return null

  return {
    subscriberCount: parseInt(channel.statistics?.subscriberCount || '0', 10),
    viewCount: parseInt(channel.statistics?.viewCount || '0', 10),
    videoCount: parseInt(channel.statistics?.videoCount || '0', 10),
    channelId: channel.id,
    title: channel.snippet?.title || '',
    thumbnail: channel.snippet?.thumbnails?.default?.url || '',
  }
}

export async function fetchMyVideos(
  accessToken: string,
  maxResults = 10,
): Promise<MyVideoItem[]> {
  const res = await fetch(
    `${YOUTUBE_API_BASE}/youtube/v3/search?forMine=true&type=video&part=snippet&order=date&maxResults=${maxResults}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!res.ok) return []

  const data = (await res.json()) as {
    items?: Array<{
      id: { videoId: string }
      snippet?: {
        title?: string
        publishedAt?: string
        thumbnails?: { medium?: { url?: string } }
      }
    }>
  }

  const base = (data.items || []).map((item) => ({
    videoId: item.id.videoId,
    title: item.snippet?.title || '',
    thumbnail: item.snippet?.thumbnails?.medium?.url || '',
    publishedAt: item.snippet?.publishedAt || '',
  }))

  // search.list는 status를 안 돌려주므로 videos.list로 privacyStatus 보강.
  const privacyById = await fetchPrivacyStatuses(accessToken, base.map((v) => v.videoId))

  return base.map((v) => ({
    ...v,
    privacyStatus: privacyById.get(v.videoId) ?? 'unknown',
  }))
}

async function fetchPrivacyStatuses(
  accessToken: string,
  videoIds: string[],
): Promise<Map<string, MyVideoItem['privacyStatus']>> {
  const result = new Map<string, MyVideoItem['privacyStatus']>()
  if (videoIds.length === 0) return result

  const res = await fetch(
    `${YOUTUBE_API_BASE}/youtube/v3/videos?part=status&id=${videoIds.join(',')}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!res.ok) return result

  const data = (await res.json()) as {
    items?: Array<{ id: string; status?: { privacyStatus?: string } }>
  }
  for (const item of data.items || []) {
    const p = item.status?.privacyStatus
    if (p === 'public' || p === 'unlisted' || p === 'private') {
      result.set(item.id, p)
    }
  }
  return result
}
