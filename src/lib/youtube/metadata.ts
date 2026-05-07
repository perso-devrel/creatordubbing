import 'server-only'

import { YouTubeError } from '@/lib/youtube/error'
import type { YouTubeLocalization, YouTubeVideoMetadata } from '@/lib/youtube/types'

const YOUTUBE_DATA_BASE = 'https://www.googleapis.com/youtube/v3'

interface YouTubeVideoResource {
  id: string
  snippet?: {
    title?: string
    description?: string
    categoryId?: string
    tags?: string[]
    defaultLanguage?: string
  }
  localizations?: Record<string, YouTubeLocalization>
}

function normalizeLocalizationMap(
  localizations: Record<string, YouTubeLocalization> | undefined,
): Record<string, YouTubeLocalization> {
  if (!localizations) return {}
  return Object.fromEntries(
    Object.entries(localizations)
      .filter(([, value]) => value.title.trim().length > 0)
      .map(([code, value]) => [
        code,
        {
          title: value.title,
          description: value.description || '',
        },
      ]),
  )
}

export async function fetchVideoMetadata(
  accessToken: string,
  videoId: string,
): Promise<YouTubeVideoMetadata> {
  const res = await fetch(
    `${YOUTUBE_DATA_BASE}/videos?part=snippet,localizations&id=${encodeURIComponent(videoId)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new YouTubeError(
      res.status,
      `YouTube metadata fetch failed: ${body}`,
      'METADATA_FETCH_FAILED',
    )
  }

  const data = (await res.json()) as { items?: YouTubeVideoResource[] }
  const item = data.items?.[0]
  if (!item?.snippet) {
    throw new YouTubeError(404, 'YouTube video not found', 'VIDEO_NOT_FOUND')
  }

  return {
    videoId: item.id,
    title: item.snippet.title || '',
    description: item.snippet.description || '',
    categoryId: item.snippet.categoryId || '22',
    tags: item.snippet.tags || [],
    // YouTube가 defaultLanguage를 비워두면 빈 문자열로 전달 — 클라이언트에서 사용자 기본값으로 fallback.
    // 'ko' 같은 임의 값을 박으면 영문 영상의 원문 언어가 한국어로 잘못 잡혀 picker 비활성화 로직이 망가진다.
    defaultLanguage: item.snippet.defaultLanguage || '',
    localizations: normalizeLocalizationMap(item.localizations),
  }
}

export async function updateVideoLocalizations(input: {
  accessToken: string
  videoId: string
  sourceLang: string
  title: string
  description: string
  localizations: Record<string, YouTubeLocalization>
}): Promise<YouTubeVideoMetadata> {
  const current = await fetchVideoMetadata(input.accessToken, input.videoId)
  const mergedLocalizations = {
    ...current.localizations,
    ...normalizeLocalizationMap(input.localizations),
  }

  const defaultLanguage = input.sourceLang || current.defaultLanguage || 'ko'
  const body = {
    id: input.videoId,
    snippet: {
      title: input.title || current.title,
      description: input.description,
      categoryId: current.categoryId || '22',
      tags: current.tags,
      defaultLanguage,
    },
    localizations: mergedLocalizations,
  }

  const res = await fetch(`${YOUTUBE_DATA_BASE}/videos?part=snippet,localizations`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new YouTubeError(
      res.status,
      `YouTube metadata update failed: ${err}`,
      'METADATA_UPDATE_FAILED',
    )
  }

  const data = (await res.json()) as YouTubeVideoResource
  const snippet = data.snippet ?? body.snippet
  return {
    videoId: data.id || input.videoId,
    title: snippet.title || body.snippet.title,
    description: snippet.description || body.snippet.description,
    categoryId: snippet.categoryId || body.snippet.categoryId,
    tags: snippet.tags || body.snippet.tags,
    defaultLanguage: snippet.defaultLanguage || defaultLanguage,
    localizations: normalizeLocalizationMap(data.localizations ?? mergedLocalizations),
  }
}
