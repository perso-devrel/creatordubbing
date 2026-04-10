import { Check } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui'
import { cn } from '@/utils/cn'
import { PLANS } from '@/features/billing/constants/plans'

export function PricingSection() {
  return (
    <section id="pricing" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-surface-900 dark:text-white sm:text-4xl">
            심플하고 투명한 요금제
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-surface-500 dark:text-surface-400">
            무료로 시작, 성장에 따라 확장. 숨겨진 비용 없음.
          </p>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <div
              key={plan.tier}
              className={cn(
                'relative rounded-2xl border p-6 transition-all',
                plan.popular
                  ? 'border-brand-500 bg-white shadow-xl shadow-brand-500/10 dark:bg-surface-900 scale-[1.02]'
                  : 'border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900',
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-1 text-xs font-bold text-white shadow-lg">
                  가장 인기
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-surface-900 dark:text-white">{plan.name}</h3>
                <p className="text-sm text-surface-600 dark:text-surface-300">{plan.description}</p>
                <div className="mt-4">
                  <span className="text-4xl font-extrabold text-surface-900 dark:text-white">{plan.priceLabel}</span>
                  {plan.price > 0 && <span className="text-surface-600 dark:text-surface-300">/월</span>}
                </div>
              </div>
              <Link href="/billing">
                <Button variant={plan.popular ? 'primary' : 'outline'} className="w-full">
                  {plan.price === 0 ? '무료로 시작' : '구독하기'}
                </Button>
              </Link>
              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                    <span className="text-surface-700 dark:text-surface-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
