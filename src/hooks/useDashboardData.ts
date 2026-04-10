'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { getStoredAccessToken } from '@/lib/firebase'

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  const json = await res.json()
  if (!json.ok) throw new Error(json.error?.message || 'Request failed')
  return json.data as T
}

export function useDashboardSummary() {
  const user = useAuthStore((s) => s.user)
  return useQuery({
    queryKey: ['dashboard-summary', user?.uid],
    queryFn: () => fetchJson<Record<string, unknown>>(`/api/dashboard/summary?uid=${user!.uid}`),
    enabled: !!user,
    staleTime: 30_000,
  })
}

export function useRecentJobs() {
  const user = useAuthStore((s) => s.user)
  return useQuery({
    queryKey: ['recent-jobs', user?.uid],
    queryFn: () => fetchJson<Record<string, unknown>[]>(`/api/dashboard/jobs?uid=${user!.uid}&limit=10`),
    enabled: !!user,
    staleTime: 30_000,
  })
}

export function useCreditUsage() {
  const user = useAuthStore((s) => s.user)
  return useQuery({
    queryKey: ['credit-usage', user?.uid],
    queryFn: () => fetchJson<Record<string, unknown>[]>(`/api/dashboard/credit-usage?uid=${user!.uid}`),
    enabled: !!user,
    staleTime: 60_000,
  })
}

export function useLanguagePerformance() {
  const user = useAuthStore((s) => s.user)
  return useQuery({
    queryKey: ['language-performance', user?.uid],
    queryFn: async () => {
      if (!user) return []
      const token = getStoredAccessToken()
      const headers: Record<string, string> = {}
      if (token) headers['x-google-access-token'] = token
      return fetchJson<Record<string, unknown>[]>(`/api/dashboard/language-performance?uid=${user.uid}`, { headers })
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  })
}

export function useChannelStats() {
  return useQuery({
    queryKey: ['channel-stats'],
    queryFn: async () => {
      const token = getStoredAccessToken()
      if (!token) return null
      return fetchJson<{ subscriberCount: number; viewCount: number; videoCount: number; channelId: string; title: string; thumbnail: string } | null>(
        `/api/youtube/stats?channel=true`,
        { headers: { 'x-google-access-token': token } },
      )
    },
    staleTime: 5 * 60_000,
  })
}
