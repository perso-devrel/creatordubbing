'use client'

import { useQuery } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'
import { useLocaleText } from '@/hooks/useLocaleText'
import { useLocaleRouter } from '@/hooks/useLocalePath'

interface OpsAlertResponse {
  count: number
}

async function fetchOpsAlertCount(): Promise<number> {
  const res = await fetch('/api/ops/alerts', { cache: 'no-store' })

  if (res.status === 401 || res.status === 403) {
    return 0
  }

  const body = await res.json().catch(() => null)
  if (!res.ok || !body?.ok) {
    throw new Error(body?.error?.message || 'Unable to load operations alerts')
  }

  return Number((body.data as OpsAlertResponse | undefined)?.count ?? 0)
}

export function OpsAlertButton() {
  const router = useLocaleRouter()
  const t = useLocaleText()
  const user = useAuthStore((state) => state.user)
  const query = useQuery({
    queryKey: ['ops-alert-count'],
    queryFn: fetchOpsAlertCount,
    enabled: !!user,
    retry: false,
    refetchInterval: 60_000,
  })

  const count = query.data ?? 0
  const label = count > 0
    ? t('features.ops.components.opsAlertButton.valueOperationsAlerts', { count: count })
    : t('features.ops.components.opsAlertButton.operationsAlerts')

  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={label}
      title={label}
      className="relative"
      onClick={() => router.push('/ops')}
    >
      <Bell className="h-4.5 w-4.5" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-4 text-white">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Button>
  )
}
