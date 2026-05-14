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
    localized?: YouTubeLocalization
  }
  localizations?: Record<string, YouTubeLocalization>
}

function normalizeLanguageTag(language?: string | null) {
  return language?.trim().toLowerCase() || ''
}

function baseLanguage(language: string) {
  return normalizeLanguageTag(language).split('-')[0] || ''
}

function isSameLanguage(left?: string | null, right?: string | null) {
  const a = normalizeLanguageTag(left)
  const b = normalizeLanguageTag(right)
  if (!a || !b) return false
  return a === b || baseLanguage(a) === baseLanguage(b)
}

function findLocalization(
  localizations: Record<string, YouTubeLocalization>,
  language?: string,
) {
  const target = normalizeLanguageTag(language)
  if (!target) return null

  const exact = Object.entries(localizations).find(([code]) => normalizeLanguageTag(code) === target)
  if (exact) return { code: exact[0], value: exact[1] }

  const targetBase = baseLanguage(target)
  if (!targetBase) return null

  const baseMatch = Object.entries(localizations).find(([code]) => baseLanguage(code) === targetBase)
  return baseMatch ? { code: baseMatch[0], value: baseMatch[1] } : null
}

function omitLanguage(
  localizations: Record<string, YouTubeLocalization>,
  language: string,
) {
  return Object.fromEntries(
    Object.entries(localizations).filter(([code]) => !isSameLanguage(code, language)),
  )
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
  preferredLanguage?: string,
): Promise<YouTubeVideoMetadata> {
  const params = new URLSearchParams({
    part: 'snippet,localizations',
    id: videoId,
  })
  if (preferredLanguage) params.set('hl', preferredLanguage)

  const res = await fetch(
    `${YOUTUBE_DATA_BASE}/videos?${params}`,
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

  const localizations = normalizeLocalizationMap(item.localizations)
  const defaultLanguage = item.snippet.defaultLanguage || ''
  const preferredLocalization = !isSameLanguage(defaultLanguage, preferredLanguage)
    ? findLocalization(localizations, preferredLanguage)
    : null
  const resolvedLanguage = preferredLocalization?.code || defaultLanguage

  return {
    videoId: item.id,
    title: preferredLocalization?.value.title || item.snippet.title || '',
    description: preferredLocalization?.value.description ?? item.snippet.description ?? '',
    categoryId: item.snippet.categoryId || '22',
    tags: item.snippet.tags || [],
    // YouTube가 defaultLanguage를 비워두면 빈 문자열로 전달 — 클라이언트에서 사용자 기본값으로 fallback.
    // 'ko' 같은 임의 값을 박으면 영문 영상의 원문 언어가 한국어로 잘못 잡혀 picker 비활성화 로직이 망가진다.
    defaultLanguage,
    resolvedLanguage,
    resolvedFrom: preferredLocalization ? 'localization' : 'default',
    localizations,
  }
}

export async function updateVideoLocalizations(input: {
  accessToken: string
  videoId: string
  sourceLang: string
  title: string
  description: string
  tags?: string[]
  localizations: Record<string, YouTubeLocalization>
}): Promise<YouTubeVideoMetadata> {
  const defaultLanguage = input.sourceLang || 'ko'
  const current = await fetchVideoMetadata(input.accessToken, input.videoId, defaultLanguage)
  const mergedLocalizations = omitLanguage({
    ...current.localizations,
    ...normalizeLocalizationMap(input.localizations),
  }, defaultLanguage)

  const body = {
    id: input.videoId,
    snippet: {
      title: input.title || current.title,
      description: input.description,
      categoryId: current.categoryId || '22',
      tags: input.tags ?? current.tags,
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
    resolvedLanguage: snippet.defaultLanguage || defaultLanguage,
    resolvedFrom: 'default',
    localizations: normalizeLocalizationMap(data.localizations ?? mergedLocalizations),
  }
}
