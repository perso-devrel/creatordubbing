'use client'

import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui'
import { useLocaleText } from '@/hooks/useLocaleText'
import { useLandingAuthRedirect } from './useLandingAuthRedirect'

export function CTASection() {
  const t = useLocaleText()
  const { authLoading, navigateWithAuth, signingIn } = useLandingAuthRedirect()

  return (
    <section className="bg-surface-950 py-20 dark:bg-surface-900">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="break-keep text-3xl font-semibold text-white sm:text-4xl">
            {t('features.landing.cTASection.prepareYourNextVideoInMoreLanguages')}
          </h2>
          <p className="mx-auto mt-4 max-w-4xl break-keep text-lg leading-8 text-surface-200 lg:whitespace-nowrap">
            {t('features.landing.cTASection.reviewTheDubbedResultsPrepareCaptionsTitlesAnd')}
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button
              type="button"
              size="lg"
              className="bg-white text-surface-950 shadow-sm hover:bg-surface-100"
              disabled={authLoading}
              loading={signingIn}
              onClick={() => void navigateWithAuth('/dubbing')}
            >
              {t('features.landing.cTASection.startANewDub')}
              <ArrowRight className="h-5 w-5" />
            </Button>
            <a
              href="#pricing"
              className="inline-flex h-11 w-full items-center justify-center rounded-md border border-white/40 px-5 text-sm font-semibold text-white transition-colors hover:border-white/70 hover:bg-white/10 focus-ring sm:w-auto"
            >
              {t('features.landing.cTASection.viewPricing')}
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
