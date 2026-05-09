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
import { useAppLocale, useLocaleText } from '@/hooks/useLocaleText'
import { text, type LocalizedText } from '@/lib/i18n/text'
import type { AppLocale } from '@/lib/i18n/config'

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

const severityTone: Record<AlertSeverity, string> = {
  info: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-200',
  warning:
    'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200',
  error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/20 dark:text-red-200',
  critical:
    'border-red-300 bg-red-100 text-red-900 dark:border-red-800 dark:bg-red-950/30 dark:text-red-100',
}

const categoryLabel: Record<OperationalEvent['category'], LocalizedText> = {
  upload_queue: { ko: '업로드', en: 'Upload queue' },
  perso: { ko: '더빙 처리', en: 'Dubbing' },
  credit: { ko: '시간 환급', en: 'Minute release' },
  toss: { ko: '결제', en: 'Payment' },
}

const severityLabel: Record<AlertSeverity, LocalizedText> = {
  info: { ko: '정보', en: 'Info' },
  warning: { ko: '주의', en: 'Warning' },
  error: { ko: '오류', en: 'Error' },
  critical: { ko: '긴급', en: 'Critical' },
}

const eventMessageLabel: Record<string, LocalizedText> = {
  'Perso language processing failed': { ko: '언어별 더빙 처리 실패', en: 'Language dubbing failed' },
  'Dubbing job failed': { ko: '더빙 작업 실패', en: 'Dubbing job failed' },
  'Toss webhook body validation failed': { ko: '결제 알림 데이터 확인 실패', en: 'Payment webhook validation failed' },
  'Toss webhook payment verification failed': { ko: '결제 승인 확인 실패', en: 'Payment verification failed' },
  'Toss webhook processing failed': { ko: '결제 알림 처리 실패', en: 'Payment webhook processing failed' },
  'Reserved credits were released': { ko: '예약된 더빙 시간 반환', en: 'Reserved minutes released' },
  'Unused reserved credits were released after finalization': { ko: '남은 예약 더빙 시간 반환', en: 'Unused reserved minutes released' },
  'YouTube upload queue item failed': { ko: 'YouTube 업로드 작업 실패', en: 'YouTube upload job failed' },
}

function formatDate(value: string, locale: AppLocale) {
  return new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

async function fetchOpsSummary(hours: number): Promise<OpsSummary> {
  const res = await fetch(`/api/ops/summary?hours=${hours}`, { cache: 'no-store' })
  const body = await res.json().catch(() => null)

  if (!res.ok || !body?.ok) {
    throw new Error(body?.error?.message || 'Unable to load operations summary')
  }

  return body.data as OpsSummary
}

function severityVariant(severity: AlertSeverity) {
  if (severity === 'critical' || severity === 'error') return 'error'
  if (severity === 'warning') return 'warning'
  return 'info'
}

export function OpsDashboard() {
  const [hours, setHours] = useState(24)
  const locale = useAppLocale()
  const t = useLocaleText()
  const windowOptions = [
    { value: '6', label: t({ ko: '최근 6시간', en: 'Last 6 hours' }) },
    { value: '24', label: t({ ko: '최근 24시간', en: 'Last 24 hours' }) },
    { value: '72', label: t({ ko: '최근 3일', en: 'Last 3 days' }) },
    { value: '168', label: t({ ko: '최근 7일', en: 'Last 7 days' }) },
  ]
  const query = useQuery({
    queryKey: ['ops-summary', hours],
    queryFn: () => fetchOpsSummary(hours),
    retry: false,
    refetchInterval: 60_000,
  })

  const summary = query.data
  const generatedLabel = summary?.generatedAt ? new Date(summary.generatedAt).toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US') : null

  if (query.isError) {
    return (
      <Card className="border-amber-200 bg-amber-50/40 dark:border-amber-900 dark:bg-amber-950/10">
        <CardTitle>{t({ ko: '운영 상태를 볼 수 없습니다', en: 'Operations access unavailable' })}</CardTitle>
        <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
          {t({ ko: '관리자 권한이 필요하거나 운영 데이터를 불러오지 못했습니다.', en: 'Admin permission is required, or operations data could not be loaded.' })}
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">{t({ ko: '운영 상태', en: 'Operations' })}</h1>
          <p className="text-surface-500 dark:text-surface-400">
            {t({
              ko: '업로드 대기열, 더빙 처리, 시간 환급, 결제 웹훅 상태를 확인합니다.',
              en: 'Monitor upload queue, dubbing jobs, minute releases, and payment webhooks.',
            })}
          </p>
          {generatedLabel && <p className="mt-1 text-xs text-surface-400">{t({ ko: '마지막 업데이트', en: 'Last updated' })}: {generatedLabel}</p>}
        </div>
        <div className="flex items-end gap-2">
          <Select
            label={t({ ko: '기간', en: 'Window' })}
            value={String(hours)}
            onChange={(event) => setHours(Number(event.target.value))}
            options={windowOptions}
            className="min-w-36"
          />
          <Button variant="outline" onClick={() => query.refetch()} loading={query.isFetching}>
            <RefreshCw className="h-4 w-4" />
            {t({ ko: '새로고침', en: 'Refresh' })}
          </Button>
        </div>
      </div>

      {summary ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={<UploadCloud className="h-5 w-5" />}
              title={t({ ko: '업로드 실패율', en: 'Upload failure rate' })}
              value={`${summary.metrics.uploadQueue.failureRate}%`}
              detail={locale === 'ko'
                ? `${summary.metrics.uploadQueue.total}건 중 ${summary.metrics.uploadQueue.failed}건 실패, 최종 실패 ${summary.metrics.uploadQueue.terminalFailed}건`
                : `${summary.metrics.uploadQueue.failed}/${summary.metrics.uploadQueue.total} failed, ${summary.metrics.uploadQueue.terminalFailed} terminal`}
              tone={summary.metrics.uploadQueue.failureRate >= 10 ? 'danger' : 'normal'}
            />
            <MetricCard
              icon={<Languages className="h-5 w-5" />}
              title={t({ ko: '더빙 처리 실패율', en: 'Dubbing failure rate' })}
              value={`${summary.metrics.perso.failureRate}%`}
              detail={locale === 'ko'
                ? `${summary.metrics.perso.total}개 언어 작업 중 ${summary.metrics.perso.failed}건 실패, ${summary.metrics.perso.canceled}건 취소`
                : `${summary.metrics.perso.failed} failed, ${summary.metrics.perso.canceled} canceled / ${summary.metrics.perso.total} language jobs`}
              tone={summary.metrics.perso.failureRate >= 10 ? 'danger' : 'normal'}
            />
            <MetricCard
              icon={<CreditCard className="h-5 w-5" />}
              title={t({ ko: '시간 환급 이벤트', en: 'Minute release events' })}
              value={`${summary.metrics.creditRefunds.events}`}
              detail={locale === 'ko'
                ? `${summary.metrics.creditRefunds.releasedMinutes}분 환급`
                : `${summary.metrics.creditRefunds.releasedMinutes} minutes released`}
              tone={summary.metrics.creditRefunds.events > 0 ? 'warn' : 'normal'}
            />
            <MetricCard
              icon={<Webhook className="h-5 w-5" />}
              title={t({ ko: '결제 웹훅 실패', en: 'Payment webhook failures' })}
              value={`${summary.metrics.toss.failureEvents}`}
              detail={locale === 'ko'
                ? `영향받은 주문 ${summary.metrics.toss.affectedOrders}건`
                : `${summary.metrics.toss.affectedOrders} affected orders`}
              tone={summary.metrics.toss.failureEvents > 0 ? 'danger' : 'normal'}
            />
          </div>

          <Card>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <CardTitle>{t({ ko: '알림', en: 'Alerts' })}</CardTitle>
                <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                  {t({ ko: '선택한 기간에서 기준치를 넘은 항목입니다.', en: 'Threshold alerts for the selected window.' })}
                </p>
              </div>
              <Badge variant={summary.alerts.length > 0 ? 'error' : 'success'}>
                {summary.alerts.length > 0
                  ? t({ ko: `${summary.alerts.length}개 확인 필요`, en: `${summary.alerts.length} active` })
                  : t({ ko: '정상', en: 'Healthy' })}
              </Badge>
            </div>
            {summary.alerts.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg bg-surface-50 p-4 text-sm text-surface-500 dark:bg-surface-800/60 dark:text-surface-400">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                {t({ ko: '선택한 기간에는 운영 알림이 없습니다.', en: 'No active operations alerts for this window.' })}
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
            <CardTitle>{t({ ko: '최근 이벤트', en: 'Recent events' })}</CardTitle>
            <div className="mt-4 overflow-hidden rounded-lg border border-surface-200 dark:border-surface-800">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-surface-50 text-xs text-surface-500 dark:bg-surface-800 dark:text-surface-400">
                    <tr>
                      <th className="px-3 py-2 font-medium">{t({ ko: '시간', en: 'Time' })}</th>
                      <th className="px-3 py-2 font-medium">{t({ ko: '분류', en: 'Category' })}</th>
                      <th className="px-3 py-2 font-medium">{t({ ko: '상태', en: 'Severity' })}</th>
                      <th className="px-3 py-2 font-medium">{t({ ko: '내용', en: 'Message' })}</th>
                      <th className="px-3 py-2 font-medium">{t({ ko: '참조', en: 'Reference' })}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-200 dark:divide-surface-800">
                    {summary.recentEvents.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-surface-400">
                          {t({ ko: '최근 운영 이벤트가 없습니다.', en: 'No recent operational events.' })}
                        </td>
                      </tr>
                    ) : (
                      summary.recentEvents.map((event) => (
                        <tr key={event.id} className="text-surface-700 dark:text-surface-200">
                          <td className="whitespace-nowrap px-3 py-2 text-xs text-surface-400">
                            {formatDate(event.createdAt, locale)}
                          </td>
                          <td className="px-3 py-2">{text(locale, categoryLabel[event.category])}</td>
                          <td className="px-3 py-2">
                            <Badge variant={severityVariant(event.severity)}>{text(locale, severityLabel[event.severity])}</Badge>
                          </td>
                          <td className="px-3 py-2">{eventMessageLabel[event.message] ? text(locale, eventMessageLabel[event.message]) : event.message}</td>
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
            {t({ ko: '운영 상태를 불러오는 중...', en: 'Loading operations summary.' })}
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
