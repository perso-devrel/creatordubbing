'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
  Languages,
  RefreshCw,
  UploadCloud,
  Webhook,
} from 'lucide-react'
import { Badge, Button, Card, CardTitle, Select } from '@/components/ui'
import { cn } from '@/utils/cn'

type AlertSeverity = 'info' | 'warning' | 'error' | 'critical'

interface OpsAlert {
  id: string
  severity: AlertSeverity
  title: string
  message: string
  metric: string
  value: number
}

interface OperationalEvent {
  id: number
  category: 'upload_queue' | 'perso' | 'credit' | 'toss'
  eventType: string
  severity: AlertSeverity
  userId: string | null
  referenceType: string | null
  referenceId: string | null
  message: string
  metadata: Record<string, unknown> | null
  createdAt: string
}

interface OpsSummary {
  generatedAt: string
  windowHours: number
  metrics: {
    uploadQueue: {
      total: number
      done: number
      pending: number
      processing: number
      failed: number
      terminalFailed: number
      failureRate: number
    }
    perso: {
      total: number
      completed: number
      failed: number
      canceled: number
      failureRate: number
    }
    creditRefunds: {
      events: number
      releasedMinutes: number
    }
    toss: {
      failureEvents: number
      affectedOrders: number
    }
  }
  alerts: OpsAlert[]
  recentEvents: OperationalEvent[]
}

const WINDOW_OPTIONS = [
  { value: '6', label: 'Last 6 hours' },
  { value: '24', label: 'Last 24 hours' },
  { value: '72', label: 'Last 3 days' },
  { value: '168', label: 'Last 7 days' },
]

const severityTone: Record<AlertSeverity, string> = {
  info: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-200',
  warning:
    'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200',
  error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/20 dark:text-red-200',
  critical:
    'border-red-300 bg-red-100 text-red-900 dark:border-red-800 dark:bg-red-950/30 dark:text-red-100',
}

const categoryLabel: Record<OperationalEvent['category'], string> = {
  upload_queue: 'Upload queue',
  perso: 'Perso',
  credit: 'Credit',
  toss: 'Toss',
}

async function fetchOpsSummary(hours: number): Promise<OpsSummary> {
  const res = await fetch(`/api/ops/summary?hours=${hours}`, { cache: 'no-store' })
  const body = await res.json().catch(() => null)

  if (!res.ok || !body?.ok) {
    throw new Error(body?.error?.message || 'Unable to load operations summary')
  }

  return body.data as OpsSummary
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('ko-KR')
}

function severityVariant(severity: AlertSeverity) {
  if (severity === 'critical' || severity === 'error') return 'error'
  if (severity === 'warning') return 'warning'
  return 'info'
}

export function OpsDashboard() {
  const [hours, setHours] = useState(24)
  const query = useQuery({
    queryKey: ['ops-summary', hours],
    queryFn: () => fetchOpsSummary(hours),
    retry: false,
    refetchInterval: 60_000,
  })

  const summary = query.data
  const generatedLabel = summary?.generatedAt ? formatDate(summary.generatedAt) : null

  if (query.isError) {
    return (
      <Card className="border-amber-200 bg-amber-50/40 dark:border-amber-900 dark:bg-amber-950/10">
        <CardTitle>Operations access unavailable</CardTitle>
        <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
          {query.error instanceof Error ? query.error.message : 'Admin permission is required.'}
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Operations</h1>
          <p className="text-surface-500 dark:text-surface-400">
            Monitor upload queue failures, Perso failures, credit releases, and Toss webhook failures.
          </p>
          {generatedLabel && <p className="mt-1 text-xs text-surface-400">Last updated: {generatedLabel}</p>}
        </div>
        <div className="flex items-end gap-2">
          <Select
            label="Window"
            value={String(hours)}
            onChange={(event) => setHours(Number(event.target.value))}
            options={WINDOW_OPTIONS}
            className="min-w-36"
          />
          <Button variant="outline" onClick={() => query.refetch()} loading={query.isFetching}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {summary ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={<UploadCloud className="h-5 w-5" />}
              title="Upload queue failure rate"
              value={`${summary.metrics.uploadQueue.failureRate}%`}
              detail={`${summary.metrics.uploadQueue.failed}/${summary.metrics.uploadQueue.total} failed, ${summary.metrics.uploadQueue.terminalFailed} terminal`}
              tone={summary.metrics.uploadQueue.failureRate >= 10 ? 'danger' : 'normal'}
            />
            <MetricCard
              icon={<Languages className="h-5 w-5" />}
              title="Perso failure rate"
              value={`${summary.metrics.perso.failureRate}%`}
              detail={`${summary.metrics.perso.failed} failed, ${summary.metrics.perso.canceled} canceled / ${summary.metrics.perso.total} language jobs`}
              tone={summary.metrics.perso.failureRate >= 10 ? 'danger' : 'normal'}
            />
            <MetricCard
              icon={<CreditCard className="h-5 w-5" />}
              title="Credit release events"
              value={`${summary.metrics.creditRefunds.events}`}
              detail={`${summary.metrics.creditRefunds.releasedMinutes} minutes released`}
              tone={summary.metrics.creditRefunds.events > 0 ? 'warn' : 'normal'}
            />
            <MetricCard
              icon={<Webhook className="h-5 w-5" />}
              title="Toss webhook failures"
              value={`${summary.metrics.toss.failureEvents}`}
              detail={`${summary.metrics.toss.affectedOrders} affected orders`}
              tone={summary.metrics.toss.failureEvents > 0 ? 'danger' : 'normal'}
            />
          </div>

          <Card>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <CardTitle>Alerts</CardTitle>
                <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                  Threshold alerts generated from the current operations window.
                </p>
              </div>
              <Badge variant={summary.alerts.length > 0 ? 'error' : 'success'}>
                {summary.alerts.length > 0 ? `${summary.alerts.length} active` : 'Healthy'}
              </Badge>
            </div>
            {summary.alerts.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg bg-surface-50 p-4 text-sm text-surface-500 dark:bg-surface-800/60 dark:text-surface-400">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                No active operations alerts for this window.
              </div>
            ) : (
              <div className="space-y-2">
                {summary.alerts.map((alert) => (
                  <div key={alert.id} className={cn('rounded-lg border p-3', severityTone[alert.severity])}>
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold">{alert.title}</p>
                        <p className="mt-0.5 text-xs opacity-80">{alert.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardTitle>Recent Events</CardTitle>
            <div className="mt-4 overflow-hidden rounded-lg border border-surface-200 dark:border-surface-800">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-surface-50 text-xs text-surface-500 dark:bg-surface-800 dark:text-surface-400">
                    <tr>
                      <th className="px-3 py-2 font-medium">Time</th>
                      <th className="px-3 py-2 font-medium">Category</th>
                      <th className="px-3 py-2 font-medium">Severity</th>
                      <th className="px-3 py-2 font-medium">Message</th>
                      <th className="px-3 py-2 font-medium">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-200 dark:divide-surface-800">
                    {summary.recentEvents.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-surface-400">
                          No recent operational events.
                        </td>
                      </tr>
                    ) : (
                      summary.recentEvents.map((event) => (
                        <tr key={event.id} className="text-surface-700 dark:text-surface-200">
                          <td className="whitespace-nowrap px-3 py-2 text-xs text-surface-400">
                            {formatDate(event.createdAt)}
                          </td>
                          <td className="px-3 py-2">{categoryLabel[event.category]}</td>
                          <td className="px-3 py-2">
                            <Badge variant={severityVariant(event.severity)}>{event.severity}</Badge>
                          </td>
                          <td className="px-3 py-2">{event.message}</td>
                          <td className="px-3 py-2 text-xs text-surface-400">
                            {event.referenceType && event.referenceId
                              ? `${event.referenceType}:${event.referenceId}`
                              : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </>
      ) : (
        <Card>
          <div className="flex items-center gap-2 text-sm text-surface-500">
            <Clock className="h-4 w-4 animate-pulse" />
            Loading operations summary.
          </div>
        </Card>
      )}
    </div>
  )
}

function MetricCard({
  icon,
  title,
  value,
  detail,
  tone,
}: {
  icon: ReactNode
  title: string
  value: string
  detail: string
  tone: 'normal' | 'warn' | 'danger'
}) {
  return (
    <Card
      className={cn(
        tone === 'danger' && 'border-red-200 dark:border-red-900',
        tone === 'warn' && 'border-amber-200 dark:border-amber-900',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-surface-500 dark:text-surface-400">{title}</p>
          <p className="mt-2 text-2xl font-bold text-surface-900 dark:text-white">{value}</p>
          <p className="mt-1 text-xs text-surface-400">{detail}</p>
        </div>
        <div
          className={cn(
            'rounded-lg p-2',
            tone === 'danger'
              ? 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-300'
              : tone === 'warn'
                ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-300'
                : 'bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-300',
          )}
        >
          {icon}
        </div>
      </div>
    </Card>
  )
}
