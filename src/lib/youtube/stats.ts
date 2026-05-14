import 'server-only'

import type { ChannelStats, MyVideoItem, VideoStats } from '@/lib/youtube/types'
import { YouTubeError } from '@/lib/youtube/error'

const YOUTUBE_API_BASE = 'https://www.googleapis.com'

async function youtubeResponseError(
  res: Response,
  fallbackMessage: string,
  code: string,
): Promise<YouTubeError> {
  const body = await res.text().catch(() => '')
  return youtubeErrorFromBody(res.status, body, fallbackMessage, code)
}

function parseYouTubeErrorBody(body: string): {
  reason?: string
  message?: string
} {
  if (!body) return {}

  try {
    const parsed = JSON.parse(body) as {
      error?: {
        message?: string
        errors?: Array<{ reason?: string }>
      }
    }
    return {
      reason: parsed.error?.errors?.[0]?.reason,
      message: parsed.error?.message,
    }
  } catch {
    return {}
  }
}

function youtubeErrorFromBody(
  status: number,
  body: string,
  fallbackMessage: string,
  code: string,
): YouTubeError {
  const parsed = parseYouTubeErrorBody(body)
  const reason = parsed.reason

  if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') {
    return new YouTubeError(
      status,
      'YouTube API 사용량 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.',
      'QUOTA_EXCEEDED',
      reason,
    )
  }

  if (reason === 'insufficientPermissions') {
    return new YouTubeError(
      status,
      'YouTube 권한이 빠진 Google 토큰입니다. 설정에서 Google 계정으로 YouTube 연결을 다시 진행하고, 권한 동의 화면에서 YouTube 권한을 허용해 주세요.',
      'YOUTUBE_RECONNECT_REQUIRED',
      reason,
    )
  }

  if (reason === 'authenticatedUserNotChannel') {
    return new YouTubeError(
      status,
      '현재 Google 계정에 YouTube 채널이 없습니다. YouTube에서 채널을 만든 뒤 다시 연결해 주세요.',
      'YOUTUBE_CHANNEL_REQUIRED',
      reason,
    )
  }

  if (reason === 'channelForbidden' || reason === 'forbidden') {
    return new YouTubeError(
      status,
      '이 Google 계정으로는 해당 YouTube 채널을 사용할 수 없습니다. 채널 소유자 또는 관리자 계정으로 다시 연결해 주세요.',
      'YOUTUBE_CHANNEL_FORBIDDEN',
      reason,
    )
  }

  if (reason === 'channelClosed' || reason === 'channelSuspended') {
    return new YouTubeError(
      status,
      'YouTube 채널이 닫혔거나 정지되어 정보를 불러올 수 없습니다. YouTube Studio에서 채널 상태를 확인해 주세요.',
      'YOUTUBE_CHANNEL_UNAVAILABLE',
      reason,
    )
  }

  return new YouTubeError(status, fallbackMessage, code, reason)
}

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
    throw await youtubeResponseError(
      res,
      'YouTube 채널 정보를 불러오지 못했습니다',
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
  const channelRes = await fetch(
    `${YOUTUBE_API_BASE}/youtube/v3/channels?part=contentDetails&mine=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!channelRes.ok) {
    throw await youtubeResponseError(
      channelRes,
      'YouTube 채널 정보를 불러오지 못했습니다',
      'MY_VIDEOS_CHANNEL_FAILED',
    )
  }

  const channelData = (await channelRes.json()) as {
    items?: Array<{
      contentDetails?: {
        relatedPlaylists?: {
          uploads?: string
        }
      }
    }>
  }
  const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
  if (!uploadsPlaylistId) return fetchMyVideosBySearch(accessToken, maxResults)

  const res = await fetch(
    `${YOUTUBE_API_BASE}/youtube/v3/playlistItems?part=snippet&playlistId=${encodeURIComponent(uploadsPlaylistId)}&maxResults=${maxResults}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    const parsed = parseYouTubeErrorBody(body)
    if (parsed.reason === 'quotaExceeded') {
      throw youtubeErrorFromBody(
        res.status,
        body,
        'YouTube 영상 목록을 불러오지 못했습니다',
        'MY_VIDEOS_FAILED',
      )
    }
    return fetchMyVideosBySearch(accessToken, maxResults)
  }

  const data = (await res.json()) as {
    items?: Array<{
      snippet?: {
        title?: string
        description?: string
        publishedAt?: string
        thumbnails?: { medium?: { url?: string } }
        resourceId?: { videoId?: string }
      }
    }>
  }

  const base = (data.items || [])
    .map((item) => {
      const videoId = item.snippet?.resourceId?.videoId
      if (!videoId) return null
      return {
        videoId,
        title: item.snippet?.title || '',
        description: item.snippet?.description || '',
        thumbnail: item.snippet?.thumbnails?.medium?.url || '',
        publishedAt: item.snippet?.publishedAt || '',
      }
    })
    .filter((item): item is Omit<MyVideoItem, 'privacyStatus'> => item !== null)

  if (base.length === 0) return fetchMyVideosBySearch(accessToken, maxResults)

  // playlistItems/search snippets can be localized or omit full metadata, so
  // videos.list is the source of truth for title, description, and privacy.
  const detailsById = await fetchVideoListDetails(accessToken, base.map((v) => v.videoId))

  return base.map((v) => ({
    ...v,
    title: detailsById.get(v.videoId)?.title ?? v.title,
    description: detailsById.get(v.videoId)?.description ?? v.description,
    privacyStatus: detailsById.get(v.videoId)?.privacyStatus ?? 'unknown',
  }))
}

async function fetchMyVideosBySearch(
  accessToken: string,
  maxResults: number,
): Promise<MyVideoItem[]> {
  const params = new URLSearchParams({
    part: 'snippet',
    forMine: 'true',
    type: 'video',
    order: 'date',
    maxResults: String(maxResults),
  })
  const res = await fetch(
    `${YOUTUBE_API_BASE}/youtube/v3/search?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!res.ok) {
    throw await youtubeResponseError(
      res,
      'YouTube 영상 목록을 불러오지 못했습니다',
      'MY_VIDEOS_FAILED',
    )
  }

  const data = (await res.json()) as {
    items?: Array<{
      id?: { videoId?: string }
      snippet?: {
        title?: string
        description?: string
        publishedAt?: string
        thumbnails?: {
          medium?: { url?: string }
          default?: { url?: string }
        }
      }
    }>
  }
  const base = (data.items || [])
    .map((item) => {
      const videoId = item.id?.videoId
      if (!videoId) return null
      return {
        videoId,
        title: item.snippet?.title || '',
        description: item.snippet?.description || '',
        thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
        publishedAt: item.snippet?.publishedAt || '',
      }
    })
    .filter((item): item is Omit<MyVideoItem, 'privacyStatus'> => item !== null)

  const detailsById = await fetchVideoListDetails(accessToken, base.map((v) => v.videoId))
  return base.map((v) => ({
    ...v,
    title: detailsById.get(v.videoId)?.title ?? v.title,
    description: detailsById.get(v.videoId)?.description ?? v.description,
    privacyStatus: detailsById.get(v.videoId)?.privacyStatus ?? 'unknown',
  }))
}

async function fetchVideoListDetails(
  accessToken: string,
  videoIds: string[],
): Promise<Map<string, Pick<MyVideoItem, 'title' | 'description' | 'privacyStatus'>>> {
  const result = new Map<string, Pick<MyVideoItem, 'title' | 'description' | 'privacyStatus'>>()
  if (videoIds.length === 0) return result

  const res = await fetch(
    `${YOUTUBE_API_BASE}/youtube/v3/videos?part=snippet,status&id=${videoIds.join(',')}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!res.ok) {
    throw await youtubeResponseError(
      res,
      'YouTube 영상 공개 상태를 불러오지 못했습니다',
      'MY_VIDEOS_STATUS_FAILED',
    )
  }

  const data = (await res.json()) as {
    items?: Array<{
      id: string
      snippet?: {
        title?: string
        description?: string
      }
      status?: { privacyStatus?: string }
    }>
  }
  for (const item of data.items || []) {
    const p = item.status?.privacyStatus
    const privacyStatus = p === 'public' || p === 'unlisted' || p === 'private'
      ? p
      : 'unknown'
    result.set(item.id, {
      title: item.snippet?.title || '',
      description: item.snippet?.description || '',
      privacyStatus,
    })
  }
  return result
}
