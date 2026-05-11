'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'

interface OpsAlertResponse {
  count: number
}

interface OperationsAccess {
  isOpsAdmin: boolean
  alertCount: number
}

const OPS_ACCESS_QUERY_KEY = ['ops-access']

interface UseOperationsAccessOptions {
  enabled?: boolean
}

async function fetchOperationsAccess(): Promise<OperationsAccess> {
  const res = await fetch('/api/ops/alerts', { cache: 'no-store' })

  if (res.status === 401 || res.status === 403) {
    return { isOpsAdmin: false, alertCount: 0 }
  }

  const body = await res.json().catch(() => null)
  if (!res.ok || !body?.ok) {
    throw new Error(body?.error?.message || 'Unable to load operations access')
  }

  return {
    isOpsAdmin: true,
    alertCount: Number((body.data as OpsAlertResponse | undefined)?.count ?? 0),
  }
}

export function useOperationsAccess(options: UseOperationsAccessOptions = {}) {
  const user = useAuthStore((state) => state.user)
  const enabled = Boolean(user) && (options.enabled ?? true)

  return useQuery({
    queryKey: OPS_ACCESS_QUERY_KEY,
    queryFn: fetchOperationsAccess,
    enabled,
    retry: false,
    staleTime: 30_000,
    refetchInterval: enabled ? 60_000 : false,
  })
}
