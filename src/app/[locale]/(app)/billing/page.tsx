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
        throw new Error(body?.error?.message || t('app.app.billing.page.checkoutCreationFailed'))
      }
      setCharged(true)
      window.location.href = body.data.checkoutUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : t('app.app.billing.page.checkoutCreationFailed'))
      setCharged(false)
    } finally {
      setIsCharging(false)
    }
  }

  const minutesRemaining = summary ? Number(summary.credits_remaining) : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">{t('app.app.billing.page.addDubbingMinutes')}</h1>
        <p className="text-surface-600 dark:text-surface-400">{t('app.app.billing.page.addDubbingMinutesAndReviewPaymentHistory')}</p>
      </div>

      {/* Remaining time */}
      <Card className="border-brand-200 dark:border-brand-800">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
              <Coins className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-surface-600 dark:text-surface-400">{t('app.app.billing.page.remainingDubbingTime')}</p>
              {isLoading ? (
                <Loader2 className="mt-1 h-6 w-6 animate-spin text-surface-300" />
              ) : (
                <p className="text-3xl font-bold text-surface-900 dark:text-white">
                  {t('common.minutes.value', { count: minutesRemaining ?? 0 })}
                </p>
              )}
            </div>
          </div>
          <p className="text-sm text-surface-500 dark:text-surface-300">{t('app.app.billing.page.paymentsAreProcessedInKRW')}</p>
        </div>
      </Card>

      {/* Credit packs */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Coins className="h-5 w-5 text-amber-500" />
          <CardTitle>{t('app.app.billing.page.chooseAMinutesPack')}</CardTitle>
        </div>
        <p className="mb-4 text-sm text-surface-500 dark:text-surface-400">
          {t('app.app.billing.page.purchasedMinutesDoNotExpire')}
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CREDIT_PACKS.map((pack) => (
            <button
              key={pack.minutes}
              onClick={() => setSelectedPack(pack.minutes)}
              className={cn(
                'rounded-lg border-2 p-4 text-left transition-all cursor-pointer focus-ring',
                selectedPack === pack.minutes
                  ? 'border-brand-600 bg-brand-50 shadow-sm dark:border-brand-500 dark:bg-brand-900/25'
                  : 'border-surface-200 bg-white hover:border-surface-300 hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-900 dark:hover:border-surface-600 dark:hover:bg-surface-800/70',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="whitespace-nowrap text-2xl font-bold text-surface-900 dark:text-white">
                  {t('common.minutes.value', { count: pack.minutes })}
                </p>
                {selectedPack === pack.minutes && <Check className="mt-1 h-4 w-4 text-brand-600 dark:text-brand-400" />}
              </div>
              {pack.labelKey && <p className="mb-2 min-h-5 text-xs text-surface-600 dark:text-surface-300">{t(pack.labelKey)}</p>}
              <p className="whitespace-nowrap text-lg font-semibold text-surface-900 dark:text-white">
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
              ? t('app.app.billing.page.openingCheckout')
              : t('app.app.billing.page.addValueMinutes', { selectedPack: selectedPack })}
            {!isCharging && !charged && <ArrowRight className="h-4 w-4" />}
          </Button>
        )}
      </Card>

      {/* Invoices */}
      <Card>
        <CardTitle>{t('app.app.billing.page.paymentHistory')}</CardTitle>
        <div className="mt-4 py-8 text-center text-sm text-surface-500 dark:text-surface-400">
          {t('app.app.billing.page.noPaymentHistoryYet')}
        </div>
      </Card>
    </div>
  )
}
