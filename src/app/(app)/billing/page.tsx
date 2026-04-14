'use client'

import { useState } from 'react'
import { CreditCard, Download, Coins, ArrowRight } from 'lucide-react'
import { Card, CardTitle, Button, Badge } from '@/components/ui'
import { cn } from '@/utils/cn'
import { CREDIT_PACKS } from '@/features/billing/constants/plans'
import { formatCurrency } from '@/utils/formatters'

// TODO: replace with real user credits from API
const mockCreditsRemaining = 0

const mockInvoices = [
  { id: 'INV-001', date: 'Apr 1, 2026', amount: 30, status: 'paid' },
  { id: 'INV-002', date: 'Mar 1, 2026', amount: 60, status: 'paid' },
]

export default function BillingPage() {
  const [selectedPack, setSelectedPack] = useState<number | null>(null)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">결제</h1>
        <p className="text-surface-500 dark:text-surface-400">크레딧을 구매하고 사용 내역을 확인하세요</p>
      </div>

      {/* Current credits */}
      <Card className="border-brand-200 dark:border-brand-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-900/20">
              <Coins className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-surface-500">남은 크레딧</p>
              <p className="text-3xl font-bold text-surface-900 dark:text-white">{mockCreditsRemaining}분</p>
            </div>
          </div>
          <Badge variant="default">1분 = $1</Badge>
        </div>
      </Card>

      {/* Credit packs */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Coins className="h-5 w-5 text-amber-500" />
          <CardTitle>크레딧 구매</CardTitle>
        </div>
        <p className="mb-4 text-sm text-surface-500 dark:text-surface-400">
          1분 더빙 = 1크레딧 = $1. 만료 없음.
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
          <Button className="mt-4">
            <CreditCard className="h-4 w-4" />
            {selectedPack}분 크레딧 구매 ({formatCurrency(selectedPack)})
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
