'use client'

import { Check } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui'
import { CREDIT_PACKS } from '@/features/billing/constants/plans'
import { formatKrw } from '@/utils/formatters'
import { SUPPORTED_LANGUAGE_COUNT } from '@/utils/languages'
import { useLocaleText } from '@/hooks/useLocaleText'

const INCLUDED_FEATURES = [
  { ko: `${SUPPORTED_LANGUAGE_COUNT}개 언어 지원`, en: `${SUPPORTED_LANGUAGE_COUNT} supported languages` },
  { ko: '1080p 출력', en: '1080p output' },
  { ko: '워터마크 없음', en: 'No watermark' },
  // '립싱크',
  { ko: 'YouTube 업로드 지원', en: 'YouTube upload support' },
  { ko: '충전한 더빙 시간 만료 없음', en: 'Purchased minutes do not expire' },
]

export function PricingSection() {
  const t = useLocaleText()

  return (
    <section id="pricing" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-surface-900 dark:text-white sm:text-4xl">
            {t({ ko: '필요한 더빙 시간만 충전하세요', en: 'Add only the dubbing minutes you need' })}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-surface-600 dark:text-surface-300">
            {t({ ko: '구독 없이 필요한 만큼 충전하세요. 더빙 시간은 1분 단위로 사용합니다.', en: 'No subscription required. Purchased minutes are used in one-minute units.' })}
          </p>
        </div>

        <div className="mt-16 mx-auto max-w-3xl">
          {/* Feature list */}
          <div className="mb-10 rounded-lg border border-surface-200 bg-white p-6 dark:border-surface-800 dark:bg-surface-900">
            <h3 className="mb-4 text-sm font-semibold text-surface-700 dark:text-surface-300">{t({ ko: '모든 충전권에 포함', en: 'Included with every pack' })}</h3>
            <ul className="grid gap-3 sm:grid-cols-2">
              {INCLUDED_FEATURES.map((feature) => (
                <li key={feature.ko} className="flex items-center gap-2 text-sm text-surface-700 dark:text-surface-300">
                  <Check className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                  {t(feature)}
                </li>
              ))}
            </ul>
          </div>

          {/* Credit packs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CREDIT_PACKS.map((pack) => (
              <div
                key={pack.minutes}
                className="rounded-lg border border-surface-200 bg-white p-6 text-center dark:border-surface-800 dark:bg-surface-900"
              >
                <p className="whitespace-nowrap text-3xl font-extrabold text-surface-900 dark:text-white">{pack.minutes}분</p>
                <p className="mt-1 whitespace-nowrap text-2xl font-bold text-brand-600 dark:text-brand-400">{formatKrw(pack.priceKrw)}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link href="/billing">
              <Button variant="primary" size="lg">
                {t({ ko: '충전권 선택하기', en: 'Choose a minutes pack' })}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
