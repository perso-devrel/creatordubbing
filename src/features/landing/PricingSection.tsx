'use client'

import { Check } from 'lucide-react'
import { LocaleLink } from '@/components/i18n/LocaleLink'
import { Button } from '@/components/ui'
import { CREDIT_PACKS } from '@/features/billing/constants/plans'
import { formatKrw } from '@/utils/formatters'
import { SUPPORTED_LANGUAGE_COUNT } from '@/utils/languages'
import { useLocaleText } from '@/hooks/useLocaleText'

const INCLUDED_FEATURES = [
  'features.landing.pricingSection.includedLanguageCount',
  'features.landing.pricingSection.included1080pOutput',
  'features.landing.pricingSection.includedNoWatermark',
  'features.landing.pricingSection.includedYouTubeUploadSupport',
  'features.landing.pricingSection.includedPurchasedMinutesDoNotExpire',
] as const

export function PricingSection() {
  const t = useLocaleText()

  return (
    <section id="pricing" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-surface-900 dark:text-white sm:text-4xl">
            {t('features.landing.pricingSection.addOnlyTheDubbingMinutesYouNeed')}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-surface-600 dark:text-surface-300">
            {t('features.landing.pricingSection.noSubscriptionRequiredPurchasedMinutesAreUsedIn')}
          </p>
        </div>

        <div className="mt-16 mx-auto max-w-3xl">
          {/* Feature list */}
          <div className="mb-10 rounded-lg border border-surface-200 bg-white p-6 dark:border-surface-800 dark:bg-surface-900">
            <h3 className="mb-4 text-sm font-semibold text-surface-700 dark:text-surface-300">{t('features.landing.pricingSection.includedWithEveryPack')}</h3>
            <ul className="grid gap-3 sm:grid-cols-2">
              {INCLUDED_FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-surface-700 dark:text-surface-300">
                  <Check className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                  {t(feature, { SUPPORTED_LANGUAGE_COUNT })}
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
                <p className="whitespace-nowrap text-3xl font-extrabold text-surface-900 dark:text-white">
                  {t('common.minutes.value', { count: pack.minutes })}
                </p>
                <p className="mt-1 whitespace-nowrap text-2xl font-bold text-brand-600 dark:text-brand-400">{formatKrw(pack.priceKrw)}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <LocaleLink href="/billing">
              <Button variant="primary" size="lg">
                {t('features.landing.pricingSection.chooseAMinutesPack')}
              </Button>
            </LocaleLink>
          </div>
        </div>
      </div>
    </section>
  )
}
