'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import type { ChannelStats, MyVideoItem } from '@/lib/youtube/types'

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' })
  const json = await res.json()
  if (!json.ok) throw new Error(json.error?.message || '요청을 처리하지 못했습니다.')
  return json.data as T
}

export function useChannelStats(enabled = true) {
  const user = useAuthStore((s) => s.user)
  return useQuery<ChannelStats | null>({
    queryKey: ['channel-stats', user?.uid],
    queryFn: () => fetchJson<ChannelStats | null>('/api/youtube/stats?channel=true'),
    enabled: !!user && enabled,
    staleTime: 5 * 60_000,
    retry: false,
  })
}

export function useMyVideos(maxResults = 10, enabled = true) {
  const user = useAuthStore((s) => s.user)
  return useQuery<MyVideoItem[]>({
    queryKey: ['my-videos', user?.uid, maxResults],
    queryFn: () => fetchJson<MyVideoItem[]>(`/api/youtube/videos?maxResults=${maxResults}`),
    enabled: !!user && enabled,
    staleTime: 2 * 60_000,
    retry: false,
  })
}
