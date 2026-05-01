import type {
  ChannelStats,
  MyVideoItem,
  VideoAnalytics,
  VideoStats,
  YouTubeUploadResult,
} from '@/lib/youtube/types'
import { json } from './shared'

const YT = '/api/youtube'

export async function ytUploadVideo(params: {
  video?: File | Blob
  videoUrl?: string
  title: string
  description: string
  tags: string[]
  categoryId?: string
  privacyStatus?: 'public' | 'unlisted' | 'private'
  language?: string
  /** BCP-47 language code → { title, description } 맵. snippet.localizations로 전달. */
  localizations?: Record<string, { title: string; description: string }>
}): Promise<YouTubeUploadResult> {
  const form = new FormData()
  if (params.videoUrl) {
    form.append('videoUrl', params.videoUrl)
  } else if (params.video) {
    form.append('video', params.video)
  }
  form.append('title', params.title)
  form.append('description', params.description)
  form.append('tags', params.tags.join(','))
  if (params.categoryId) form.append('categoryId', params.categoryId)
  if (params.privacyStatus) form.append('privacyStatus', params.privacyStatus)
  if (params.language) form.append('language', params.language)
  if (params.localizations && Object.keys(params.localizations).length > 0) {
    form.append('localizations', JSON.stringify(params.localizations))
  }

  const res = await fetch(`${YT}/upload`, {
    method: 'POST',
    body: form,
  })
  return json<YouTubeUploadResult>(res)
}

export async function ytUploadCaption(params: {
  videoId: string
  language: string
  name: string
  srtContent: string
  /** true면 동일 language의 기존 자막 트랙을 삭제하고 교체한다. */
  replace?: boolean
}): Promise<{ uploaded: true }> {
  const res = await fetch(`${YT}/caption`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  return json(res)
}

export async function ytFetchChannelStats(): Promise<ChannelStats | null> {
  const res = await fetch(`${YT}/stats?channel=true`, { cache: 'no-store' })
  return json(res)
}

export async function ytFetchVideoStats(
  videoIds: string[],
): Promise<VideoStats[]> {
  const qs = new URLSearchParams({ videoIds: videoIds.join(',') }).toString()
  const res = await fetch(`${YT}/stats?${qs}`, { cache: 'no-store' })
  return json(res)
}

export async function ytFetchMyVideos(
  maxResults = 10,
): Promise<MyVideoItem[]> {
  const res = await fetch(`${YT}/videos?maxResults=${maxResults}`, { cache: 'no-store' })
  return json(res)
}

export async function ytFetchAnalytics(
  videoIds: string[],
  startDate?: string,
  endDate?: string,
): Promise<VideoAnalytics[]> {
  const params = new URLSearchParams({
    videoIds: videoIds.join(','),
  })
  if (startDate) params.set('startDate', startDate)
  if (endDate) params.set('endDate', endDate)
  const res = await fetch(`${YT}/analytics?${params}`, { cache: 'no-store' })
  return json(res)
}
