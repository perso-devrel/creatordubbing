import 'server-only'

import type {
  ChannelStats,
  MyVideoItem,
  VideoStats,
  YouTubeUploadResult,
} from '@/lib/youtube/types'

const YOUTUBE_API_BASE = 'https://www.googleapis.com'
const YOUTUBE_UPLOAD_BASE = 'https://www.googleapis.com/upload/youtube/v3'

export class YouTubeError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = 'YOUTUBE_ERROR',
  ) {
    super(message)
    this.name = 'YouTubeError'
  }
}

export interface YouTubeUploadInput {
  accessToken: string
  /** Binary video payload to forward. */
  videoBlob: Blob
  title: string
  description: string
  tags: string[]
  categoryId?: string
  privacyStatus?: 'public' | 'unlisted' | 'private'
  language?: string
}

/**
 * Resumable video upload via YouTube Data API v3.
 * Server-side port of the Vite project's `uploadVideoToYouTube`.
 */
export async function uploadVideoToYouTube(
  input: YouTubeUploadInput,
): Promise<YouTubeUploadResult> {
  const {
    accessToken,
    videoBlob,
    title,
    description,
    tags,
    categoryId = '22',
    privacyStatus = 'private',
    language = 'en',
  } = input

  const metadata = {
    snippet: {
      title,
      description,
      tags,
      categoryId,
      defaultLanguage: language,
      defaultAudioLanguage: language,
    },
    status: {
      privacyStatus,
      selfDeclaredMadeForKids: false,
    },
  }

  // Step 1 — initiate resumable upload
  const initRes = await fetch(
    `${YOUTUBE_UPLOAD_BASE}/videos?uploadType=resumable&part=snippet,status`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Length': String(videoBlob.size),
        'X-Upload-Content-Type': videoBlob.type || 'video/mp4',
      },
      body: JSON.stringify(metadata),
    },
  )

  if (!initRes.ok) {
    const err = await initRes.text()
    throw new YouTubeError(
      initRes.status,
      `YouTube upload init failed: ${err}`,
      'UPLOAD_INIT_FAILED',
    )
  }

  const uploadUrl = initRes.headers.get('Location')
  if (!uploadUrl) {
    throw new YouTubeError(
      500,
      'YouTube did not return a resumable upload URL',
      'NO_UPLOAD_URL',
    )
  }

  // Step 2 — PUT the binary
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': videoBlob.type || 'video/mp4',
    },
    body: videoBlob,
  })

  if (!putRes.ok) {
    const err = await putRes.text()
    throw new YouTubeError(
      putRes.status,
      `YouTube upload failed: ${err}`,
      'UPLOAD_FAILED',
    )
  }

  const result = (await putRes.json()) as {
    id: string
    snippet?: { title?: string }
    status?: { uploadStatus?: string }
  }

  return {
    videoId: result.id,
    title: result.snippet?.title || title,
    status: result.status?.uploadStatus || 'uploaded',
  }
}

export interface CaptionUploadInput {
  accessToken: string
  videoId: string
  language: string
  name: string
  srtContent: string
}

/** Upload an SRT caption track to an existing video. */
export async function uploadCaptionToYouTube(
  input: CaptionUploadInput,
): Promise<void> {
  const { accessToken, videoId, language, name, srtContent } = input

  const metadata = { snippet: { videoId, language, name } }
  const boundary = `caption_boundary_${Date.now()}`
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(metadata) +
    `\r\n--${boundary}\r\n` +
    `Content-Type: application/x-subrip\r\n\r\n` +
    srtContent +
    `\r\n--${boundary}--`

  const res = await fetch(
    `${YOUTUBE_UPLOAD_BASE}/captions?uploadType=multipart&part=snippet`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  )

  if (!res.ok) {
    const err = await res.text()
    throw new YouTubeError(
      res.status,
      `Caption upload failed: ${err}`,
      'CAPTION_UPLOAD_FAILED',
    )
  }
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
  if (!res.ok) return null

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

  return (data.items || []).map((item) => ({
    videoId: item.id.videoId,
    title: item.snippet?.title || '',
    thumbnail: item.snippet?.thumbnails?.medium?.url || '',
    publishedAt: item.snippet?.publishedAt || '',
  }))
}
