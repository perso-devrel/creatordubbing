'use client'

import { useState } from 'react'
import { CreditCard, Coins, ArrowRight, Loader2, Check } from 'lucide-react'
import { Card, CardTitle, Button } from '@/components/ui'
import { cn } from '@/utils/cn'
import { CREDIT_PACKS } from '@/features/billing/constants/plans'
import { formatKrw } from '@/utils/formatters'
import { useDashboardSummary } from '@/hooks/useDashboardData'
import { useLocaleText } from '@/hooks/useLocaleText'

export default function BillingPage() {
  const t = useLocaleText()
  const [selectedPack, setSelectedPack] = useState<number | null>(null)
  const [isCharging, setIsCharging] = useState(false)
  const [charged, setCharged] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { data: summary, isLoading } = useDashboardSummary()

  const handleCharge = async () => {
    if (!selectedPack) return
    setIsCharging(true)
    setError(null)
    try {
      const res = await fetch('/api/billing/toss/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes: selectedPack }),
        cache: 'no-store',
      })
      const body = await res.json().catch(() => null)
      if (!body?.ok || !body.data?.checkoutUrl) {
        throw new Error(body?.error?.message || '결제창 생성에 실패했습니다.')
      }
      setCharged(true)
      window.location.href = body.data.checkoutUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : '결제창 생성에 실패했습니다.')
      setCharged(false)
    } finally {
      setIsCharging(false)
    }
  }

  const minutesRemaining = summary ? Number(summary.credits_remaining) : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">{t({ ko: '결제', en: 'Billing' })}</h1>
        <p className="text-surface-500 dark:text-surface-400">{t({ ko: '더빙 시간을 충전하고 결제 내역을 확인하세요.', en: 'Add dubbing minutes and review payment history.' })}</p>
      </div>

      {/* Remaining time */}
      <Card className="border-brand-200 dark:border-brand-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-900/20">
              <Coins className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-surface-500">{t({ ko: '남은 더빙 시간', en: 'Remaining dubbing time' })}</p>
              {isLoading ? (
                <Loader2 className="mt-1 h-6 w-6 animate-spin text-surface-300" />
              ) : (
                <p className="text-3xl font-bold text-surface-900 dark:text-white">
                  {minutesRemaining ?? 0}분
                </p>
              )}
            </div>
          </div>
          <p className="text-sm text-surface-400">{t({ ko: '결제는 원화(KRW)로 처리됩니다.', en: 'Payments are processed in KRW.' })}</p>
        </div>
      </Card>

      {/* Credit packs */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Coins className="h-5 w-5 text-amber-500" />
          <CardTitle>{t({ ko: '더빙 시간 충전', en: 'Add dubbing minutes' })}</CardTitle>
        </div>
        <p className="mb-4 text-sm text-surface-500 dark:text-surface-400">
          {t({ ko: '충전한 시간은 만료 없이 사용할 수 있습니다.', en: 'Purchased minutes do not expire.' })}
        </p>

        <div className="grid gap-3 sm:grid-cols-4">
          {CREDIT_PACKS.map((pack) => (
            <button
              key={pack.minutes}
              onClick={() => setSelectedPack(pack.minutes)}
              className={cn(
                'rounded-xl border-2 p-4 text-left transition-all cursor-pointer',
                selectedPack === pack.minutes
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                  : 'border-surface-200 hover:border-surface-300 dark:border-surface-800 dark:hover:border-surface-700',
              )}
            >
              <p className="text-2xl font-bold text-surface-900 dark:text-white">{pack.minutes}분</p>
              <p className="text-xs text-surface-500 mb-2">{pack.label}</p>
              <p className="text-lg font-semibold text-surface-900 dark:text-white">
                {formatKrw(pack.priceKrw)}
              </p>
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        {selectedPack && (
          <Button className="mt-4" onClick={handleCharge} disabled={isCharging || charged}>
            {isCharging ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : charged ? (
              <Check className="h-4 w-4" />
            ) : (
              <CreditCard className="h-4 w-4" />
            )}
            {charged
              ? t({ ko: '결제창으로 이동 중...', en: 'Opening checkout...' })
              : t({ ko: `${selectedPack}분 충전`, en: `Add ${selectedPack} minutes` })}
            {!isCharging && !charged && <ArrowRight className="h-4 w-4" />}
          </Button>
        )}
      </Card>

      {/* Invoices */}
      <Card>
        <CardTitle>{t({ ko: '결제 내역', en: 'Payment history' })}</CardTitle>
        <div className="mt-4 py-8 text-center text-sm text-surface-400">
          {t({ ko: '결제 내역이 없습니다', en: 'No payment history yet' })}
        </div>
      </Card>
    </div>
  )
}
