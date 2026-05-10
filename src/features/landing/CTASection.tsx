'use client'

import { ArrowRight } from 'lucide-react'
import { LocaleLink } from '@/components/i18n/LocaleLink'
import { Button } from '@/components/ui'
import { useLocaleText } from '@/hooks/useLocaleText'

export function CTASection() {
  const t = useLocaleText()

  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="rounded-xl border border-surface-800 bg-surface-950 p-12 text-center shadow-xl shadow-surface-900/10 dark:border-surface-700 dark:bg-surface-900 sm:p-16">
          <div>
            <h2 className="break-keep text-3xl font-extrabold text-white sm:text-4xl">
              {t('features.landing.cTASection.prepareYourNextVideoInMoreLanguages')}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-surface-200">
              {t('features.landing.cTASection.reviewTheDubbedResultsPrepareCaptionsTitlesAnd')}
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <LocaleLink href="/dashboard">
                <Button size="lg" className="bg-white text-surface-950 shadow-sm hover:bg-surface-100">
                  {t('features.landing.cTASection.startANewDub')}
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </LocaleLink>
              <a href="#pricing">
                <Button
                  variant="ghost"
                  size="lg"
                  className="border-2 border-white/80 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 hover:border-white"
                >
                  {t('features.landing.cTASection.viewPricing')}
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
