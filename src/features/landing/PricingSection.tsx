import { Check } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui'
import { CREDIT_PACKS } from '@/features/billing/constants/plans'
import { formatKrw } from '@/utils/formatters'
import { SUPPORTED_LANGUAGE_COUNT } from '@/utils/languages'

const INCLUDED_FEATURES = [
  `${SUPPORTED_LANGUAGE_COUNT}개 언어 지원`,
  '1080p 출력',
  '워터마크 없음',
  // '립싱크',
  'YouTube 업로드 지원',
  '충전한 더빙 시간 만료 없음',
]

export function PricingSection() {
  return (
    <section id="pricing" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-surface-900 dark:text-white sm:text-4xl">
            필요한 더빙 시간만 충전하세요
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-surface-500 dark:text-surface-400">
            구독 없이 필요한 만큼 충전하세요. 더빙 시간은 1분 단위로 사용합니다.
          </p>
        </div>

        <div className="mt-16 mx-auto max-w-3xl">
          {/* Feature list */}
          <div className="mb-10 rounded-lg border border-surface-200 bg-white p-6 dark:border-surface-800 dark:bg-surface-900">
            <h3 className="mb-4 text-sm font-semibold text-surface-700 dark:text-surface-300">모든 충전권에 포함</h3>
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
                className="rounded-lg border border-surface-200 bg-white p-6 text-center dark:border-surface-800 dark:bg-surface-900"
              >
                <p className="whitespace-nowrap text-3xl font-extrabold text-surface-900 dark:text-white">{pack.minutes}분</p>
                <p className="mt-1 whitespace-nowrap text-2xl font-bold text-brand-600">{formatKrw(pack.priceKrw)}</p>
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
