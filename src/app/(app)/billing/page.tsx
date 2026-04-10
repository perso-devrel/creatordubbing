'use client'

import { useState } from 'react'
import { Check, CreditCard, Download, Coins, ArrowRight } from 'lucide-react'
import { Card, CardTitle, Button, Badge, Progress } from '@/components/ui'
import { cn } from '@/utils/cn'
import { PLANS, CREDIT_PACKS } from '@/features/billing/constants/plans'
import { formatCurrency } from '@/utils/formatters'

const mockSubscription = {
  plan: 'creator' as const,
  creditsUsed: 344,
  creditsTotal: 500,
  billingDate: 'May 1, 2026',
  minutesUsed: 245,
}

const mockInvoices = [
  { id: 'INV-001', date: 'Apr 1, 2026', amount: 29.99, status: 'paid' },
  { id: 'INV-002', date: 'Mar 1, 2026', amount: 29.99, status: 'paid' },
  { id: 'INV-003', date: 'Feb 1, 2026', amount: 29.99, status: 'paid' },
  { id: 'INV-004', date: 'Jan 1, 2026', amount: 9.99, status: 'paid' },
]

export default function BillingPage() {
  const [selectedPack, setSelectedPack] = useState<number | null>(null)

  const currentPlan = PLANS.find((p) => p.tier === mockSubscription.plan)!

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">결제</h1>
        <p className="text-surface-500 dark:text-surface-400">구독 및 크레딧을 관리하세요</p>
      </div>

      {/* Current plan */}
      <Card className="border-brand-200 dark:border-brand-800">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>현재 플랜</CardTitle>
              <Badge variant="brand">{currentPlan.name}</Badge>
            </div>
            <p className="mt-1 text-sm text-surface-500">
              {currentPlan.priceLabel}/month · 다음 결제: {mockSubscription.billingDate}
            </p>
          </div>
          <Button variant="outline" size="sm">구독 관리</Button>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-surface-50 p-4 dark:bg-surface-800">
            <p className="text-xs text-surface-500 mb-1">크레딧 사용량</p>
            <p className="text-lg font-bold text-surface-900 dark:text-white">
              {mockSubscription.creditsUsed} / {mockSubscription.creditsTotal}
            </p>
            <Progress value={mockSubscription.creditsUsed} max={mockSubscription.creditsTotal} size="sm" className="mt-2" />
          </div>
          <div className="rounded-lg bg-surface-50 p-4 dark:bg-surface-800">
            <p className="text-xs text-surface-500 mb-1">이번 달 더빙 시간</p>
            <p className="text-lg font-bold text-surface-900 dark:text-white">
              {mockSubscription.minutesUsed} min
            </p>
            <Badge variant="success" className="mt-2">무제한</Badge>
          </div>
        </div>
      </Card>

      {/* Plan comparison */}
      <Card>
        <CardTitle>플랜 변경</CardTitle>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => {
            const isCurrent = plan.tier === mockSubscription.plan
            return (
              <div
                key={plan.tier}
                className={cn(
                  'rounded-xl border p-4 transition-all',
                  isCurrent
                    ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-900/10'
                    : 'border-surface-200 dark:border-surface-800',
                  plan.popular && !isCurrent && 'border-brand-200 dark:border-brand-800',
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-surface-900 dark:text-white">{plan.name}</h3>
                  {isCurrent && <Badge variant="brand">현재</Badge>}
                </div>
                <p className="text-2xl font-bold text-surface-900 dark:text-white">
                  {plan.priceLabel}
                  {plan.price > 0 && <span className="text-sm font-normal text-surface-500">/mo</span>}
                </p>
                <ul className="mt-3 space-y-1.5">
                  {plan.features.slice(0, 4).map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-xs text-surface-600 dark:text-surface-400">
                      <Check className="h-3 w-3 shrink-0 mt-0.5 text-brand-500" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={isCurrent ? 'secondary' : 'outline'}
                  size="sm"
                  className="w-full mt-3"
                  disabled={isCurrent}
                >
                  {isCurrent ? '현재 플랜' : '변경'}
                </Button>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Credit packs */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Coins className="h-5 w-5 text-amber-500" />
          <CardTitle>크레딧 구매</CardTitle>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {CREDIT_PACKS.map((pack) => (
            <button
              key={pack.credits}
              onClick={() => setSelectedPack(pack.credits)}
              className={cn(
                'rounded-xl border-2 p-4 text-left transition-all cursor-pointer',
                selectedPack === pack.credits
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                  : 'border-surface-200 hover:border-surface-300 dark:border-surface-800 dark:hover:border-surface-700',
              )}
            >
              <p className="text-2xl font-bold text-surface-900 dark:text-white">{pack.credits}</p>
              <p className="text-xs text-surface-500">크레딧</p>
              <p className="mt-2 text-lg font-semibold text-surface-900 dark:text-white">
                {formatCurrency(pack.price)}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                {formatCurrency(pack.perCredit)}/credit
              </p>
            </button>
          ))}
        </div>

        {selectedPack && (
          <Button className="mt-4">
            <CreditCard className="h-4 w-4" />
            {selectedPack} 크레딧 구매
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </Card>

      {/* Invoices */}
      <Card>
        <CardTitle>인보이스</CardTitle>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200 dark:border-surface-800">
                <th className="pb-2 text-left font-medium text-surface-500">인보이스</th>
                <th className="pb-2 text-left font-medium text-surface-500">날짜</th>
                <th className="pb-2 text-left font-medium text-surface-500">금액</th>
                <th className="pb-2 text-left font-medium text-surface-500">상태</th>
                <th className="pb-2 text-right font-medium text-surface-500"></th>
              </tr>
            </thead>
            <tbody>
              {mockInvoices.map((inv) => (
                <tr key={inv.id} className="border-b border-surface-100 dark:border-surface-800">
                  <td className="py-3 font-medium text-surface-900 dark:text-white">{inv.id}</td>
                  <td className="py-3 text-surface-500">{inv.date}</td>
                  <td className="py-3 text-surface-900 dark:text-white">{formatCurrency(inv.amount)}</td>
                  <td className="py-3">
                    <Badge variant="success">결제 완료</Badge>
                  </td>
                  <td className="py-3 text-right">
                    <button className="text-surface-400 hover:text-surface-600">
                      <Download className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
