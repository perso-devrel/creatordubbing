'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import type { ChannelStats, MyVideoItem } from '@/lib/youtube/types'

export class YouTubeDataError extends Error {
  constructor(
    message: string,
    public code: string | undefined,
    public status: number,
  ) {
    super(message)
    this.name = 'YouTubeDataError'
  }
}

interface ApiResponse<T> {
  ok?: boolean
  data?: T
  error?: {
    code?: string
    message?: string
  }
}

const YOUTUBE_RECONNECT_ERROR_CODES = new Set([
  'MISSING_ACCESS_TOKEN',
  'UNAUTHORIZED',
  'YOUTUBE_RECONNECT_REQUIRED',
  'YOUTUBE_CHANNEL_REQUIRED',
  'YOUTUBE_CHANNEL_FORBIDDEN',
  'YOUTUBE_CHANNEL_UNAVAILABLE',
])

export function isYouTubeConnectionError(error: unknown): boolean {
  if (error instanceof YouTubeDataError) {
    return YOUTUBE_RECONNECT_ERROR_CODES.has(error.code ?? '') || error.status === 401
  }
  return error instanceof Error && (
    error.message.includes('Google access token') ||
    error.message.includes('YouTube 연결')
  )
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' })
  const json = (await res.json().catch(() => null)) as ApiResponse<T> | null
  if (!res.ok || !json?.ok) {
    throw new YouTubeDataError(
      json?.error?.message || 'YouTube request failed.',
      json?.error?.code,
      res.status,
    )
  }
  return json.data as T
}

export function useChannelStats(enabled = true) {
  const user = useAuthStore((s) => s.user)
  return useQuery<ChannelStats | null, YouTubeDataError>({
    queryKey: ['channel-stats', user?.uid],
    queryFn: () => fetchJson<ChannelStats | null>('/api/youtube/stats?channel=true'),
    enabled: !!user && enabled,
    staleTime: 5 * 60_000,
    retry: false,
  })
}

export function useMyVideos(maxResults = 10, enabled = true) {
  const user = useAuthStore((s) => s.user)
  return useQuery<MyVideoItem[], YouTubeDataError>({
    queryKey: ['my-videos', user?.uid, maxResults],
    queryFn: () => fetchJson<MyVideoItem[]>(`/api/youtube/videos?maxResults=${maxResults}`),
    enabled: !!user && enabled,
    staleTime: 2 * 60_000,
    retry: false,
  })
}
