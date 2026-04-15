'use client'

import { useState } from 'react'
import { CreditCard, Coins, ArrowRight, Loader2, Check } from 'lucide-react'
import { Card, CardTitle, Button } from '@/components/ui'
import { cn } from '@/utils/cn'
import { CREDIT_PACKS } from '@/features/billing/constants/plans'
import { formatCurrency } from '@/utils/formatters'
import { useDashboardSummary } from '@/hooks/useDashboardData'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { dbMutation } from '@/lib/api/dbMutation'

export default function BillingPage() {
  const [selectedPack, setSelectedPack] = useState<number | null>(null)
  const [isCharging, setIsCharging] = useState(false)
  const [charged, setCharged] = useState(false)
  const { data: summary, isLoading } = useDashboardSummary()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  const handleCharge = async () => {
    if (!selectedPack || !user) return
    setIsCharging(true)
    try {
      await dbMutation({ type: 'addCredits', payload: { userId: user.uid, minutes: selectedPack } })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      setCharged(true)
      setTimeout(() => {
        setCharged(false)
        setSelectedPack(null)
      }, 2000)
    } finally {
      setIsCharging(false)
    }
  }

  const minutesRemaining = summary ? Number(summary.credits_remaining) : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">결제</h1>
        <p className="text-surface-500 dark:text-surface-400">시간을 충전하고 사용 내역을 확인하세요</p>
      </div>

      {/* Remaining time */}
      <Card className="border-brand-200 dark:border-brand-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-900/20">
              <Coins className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-surface-500">남은 시간</p>
              {isLoading ? (
                <Loader2 className="mt-1 h-6 w-6 animate-spin text-surface-300" />
              ) : (
                <p className="text-3xl font-bold text-surface-900 dark:text-white">
                  {minutesRemaining ?? 0}분
                </p>
              )}
            </div>
          </div>
          <p className="text-sm text-surface-400">1분 = $1</p>
        </div>
      </Card>

      {/* Credit packs */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Coins className="h-5 w-5 text-amber-500" />
          <CardTitle>시간 충전</CardTitle>
        </div>
        <p className="mb-4 text-sm text-surface-500 dark:text-surface-400">
          1분 더빙 = $1. 만료 없음.
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
                {formatCurrency(pack.price)}
              </p>
            </button>
          ))}
        </div>

        {selectedPack && (
          <Button className="mt-4" onClick={handleCharge} disabled={isCharging || charged}>
            {isCharging ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : charged ? (
              <Check className="h-4 w-4" />
            ) : (
              <CreditCard className="h-4 w-4" />
            )}
            {charged ? '충전 완료!' : `${selectedPack}분 충전 (${formatCurrency(selectedPack)})`}
            {!isCharging && !charged && <ArrowRight className="h-4 w-4" />}
          </Button>
        )}
      </Card>

      {/* Invoices */}
      <Card>
        <CardTitle>결제 내역</CardTitle>
        <div className="mt-4 py-8 text-center text-sm text-surface-400">
          결제 내역이 없습니다
        </div>
      </Card>
    </div>
  )
}
