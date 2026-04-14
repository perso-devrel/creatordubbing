import { Check } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui'
import { CREDIT_PACKS } from '@/features/billing/constants/plans'
import { formatCurrency } from '@/utils/formatters'

const INCLUDED_FEATURES = [
  '모든 언어 지원',
  '1080p 출력',
  '워터마크 없음',
  '립싱크',
  'YouTube 자동 업로드',
  '크레딧 만료 없음',
]

export function PricingSection() {
  return (
    <section id="pricing" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-surface-900 dark:text-white sm:text-4xl">
            심플하고 투명한 요금제
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-surface-500 dark:text-surface-400">
            구독 없음. 1분 더빙 = $1. 원하는 만큼 충전해서 사용하세요.
          </p>
        </div>

        <div className="mt-16 mx-auto max-w-3xl">
          {/* Feature list */}
          <div className="mb-10 rounded-2xl border border-surface-200 bg-white p-6 dark:border-surface-800 dark:bg-surface-900">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-surface-500 mb-4">모든 플랜 포함</h3>
            <ul className="grid gap-3 sm:grid-cols-2">
              {INCLUDED_FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-surface-700 dark:text-surface-300">
                  <Check className="h-4 w-4 shrink-0 text-brand-500" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Credit packs */}
          <div className="grid gap-4 sm:grid-cols-4">
            {CREDIT_PACKS.map((pack) => (
              <div
                key={pack.minutes}
                className="rounded-2xl border border-surface-200 bg-white p-6 text-center dark:border-surface-800 dark:bg-surface-900"
              >
                <p className="text-3xl font-extrabold text-surface-900 dark:text-white">{pack.minutes}분</p>
                <p className="mt-1 text-2xl font-bold text-brand-600">{formatCurrency(pack.price)}</p>
                <p className="mt-1 text-xs text-surface-500">$1/분</p>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link href="/billing">
              <Button variant="primary" size="lg">
                지금 시작하기
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
