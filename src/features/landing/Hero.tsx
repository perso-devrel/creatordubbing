'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Globe,
  Languages,
  Loader2,
  UploadCloud,
} from 'lucide-react'
import { Button } from '@/components/ui'
import { SUPPORTED_LANGUAGE_COUNT } from '@/utils/languages'
import { useLocaleText } from '@/hooks/useLocaleText'
import { useLandingAuthRedirect } from './useLandingAuthRedirect'

const STEP_ADVANCE_DELAY_MS = 4000
const COMPLETED_PAUSE_MS = 10000

function GoogleMark() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

export function Hero() {
  const t = useLocaleText()
  const { isAuthenticated, navigateWithAuth, signingIn } = useLandingAuthRedirect()
  const pipelineSteps = useMemo(
    () => [
      {
        title: t('features.landing.hero.pipelineSourceVideo'),
        detail: t('features.landing.hero.pipelineSourceVideoDetail'),
      },
      {
        title: t('features.landing.hero.pipelineLanguages'),
        detail: t('features.landing.hero.pipelineLanguagesDetail'),
      },
      {
        title: t('features.landing.hero.pipelineOutputMode'),
        detail: t('features.landing.hero.pipelineOutputModeDetail'),
      },
      {
        title: t('features.landing.hero.pipelineUploadSettings'),
        detail: t('features.landing.hero.pipelineUploadSettingsDetail'),
      },
      {
        title: t('features.landing.hero.pipelineDubbingCaptions'),
        detail: t('features.landing.hero.pipelineDubbingCaptionsDetail'),
      },
      {
        title: t('features.landing.hero.pipelineUploadResults'),
        detail: t('features.landing.hero.pipelineUploadResultsDetail'),
      },
    ],
    [t],
  )
  const quickStats = useMemo(
    () => [
      {
        icon: Globe,
        label: t('features.landing.hero.valueSupportedLanguages', { SUPPORTED_LANGUAGE_COUNT }),
        desc: t('features.landing.hero.dubsCaptionsMetadata'),
      },
      {
        icon: UploadCloud,
        label: t('features.landing.hero.youTubeUploadSupport'),
        desc: t('features.landing.hero.privacyAndDisclosureChecks'),
      },
      {
        icon: BadgeCheck,
        label: t('features.landing.hero.reviewBeforePublishing'),
        desc: t('features.landing.hero.checkEachLanguageResult'),
      },
    ],
    [t],
  )
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    const delay = activeStep === pipelineSteps.length ? COMPLETED_PAUSE_MS : STEP_ADVANCE_DELAY_MS
    const timer = window.setTimeout(() => {
      setActiveStep((current) => current >= pipelineSteps.length ? 0 : current + 1)
    }, delay)

    return () => window.clearTimeout(timer)
  }, [activeStep, pipelineSteps.length])

  const isCycleComplete = activeStep === pipelineSteps.length
  const completedStepCount = isCycleComplete ? pipelineSteps.length : activeStep
  const progressPercent = Math.round((completedStepCount / pipelineSteps.length) * 100)

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-white dark:bg-surface-950" />

      <div className="relative mx-auto max-w-[1400px] px-6 pb-14 pt-12 sm:pt-14 lg:pb-16 lg:pt-16">
        <div className="grid items-stretch gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(520px,560px)]">
          <div className="flex min-h-full flex-col items-start justify-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700 dark:border-brand-900/60 dark:bg-brand-900/25 dark:text-brand-300">
              <Languages className="h-3.5 w-3.5" />
              {t('features.landing.hero.youTubeVideoLocalization')}
            </div>

            <h1 className="max-w-4xl whitespace-pre-line break-keep text-3xl font-semibold leading-[1.24] text-surface-950 dark:text-white sm:text-5xl sm:leading-[1.2] lg:text-6xl">
              {t('features.landing.hero.createMultilingualDubsFromOneVideo')}
            </h1>

            <p className="mt-6 max-w-2xl break-keep text-base leading-8 text-surface-600 dark:text-surface-300 sm:text-lg">
              {t('features.landing.hero.addAYouTubeLinkOrFileChooseLanguages')}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                size="lg"
                disabled={signingIn}
                loading={signingIn}
                onClick={() => void navigateWithAuth('/dubbing')}
                className="bg-surface-950 text-white hover:bg-surface-800 active:bg-surface-900 dark:bg-white dark:text-surface-950 dark:hover:bg-surface-200"
              >
                {!isAuthenticated && !signingIn ? <GoogleMark /> : null}
                {isAuthenticated
                  ? t('features.landing.cTASection.startANewDub')
                  : t('features.landing.hero.startWithGoogle')}
                <ArrowRight className="h-5 w-5" />
              </Button>
              <a
                href="#pricing"
                className="inline-flex h-11 w-full items-center justify-center rounded-md border border-surface-300 bg-white px-5 text-sm font-semibold text-surface-700 transition-colors hover:border-surface-400 hover:bg-surface-50 focus-ring dark:border-surface-700 dark:bg-transparent dark:text-surface-300 dark:hover:border-surface-600 dark:hover:bg-surface-850 sm:w-auto"
              >
                {t('features.landing.cTASection.viewPricing')}
              </a>
            </div>

            <div className="mt-9 grid w-full max-w-3xl overflow-hidden rounded-lg border border-surface-200 bg-white shadow-sm shadow-surface-950/[0.03] dark:border-surface-800 dark:bg-surface-900 sm:grid-cols-3">
              {quickStats.map(({ icon: Icon, label, desc }) => (
                <div
                  key={label}
                  className="flex gap-3 border-b border-surface-200 p-4 last:border-b-0 dark:border-surface-800 sm:border-b-0 sm:border-r sm:last:border-r-0"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-surface-200 bg-surface-50 text-brand-600 dark:border-surface-800 dark:bg-surface-850 dark:text-brand-400">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-surface-950 dark:text-white">{label}</div>
                    <div className="mt-1 break-keep text-xs leading-5 text-surface-600 dark:text-surface-400">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex min-h-full flex-col rounded-lg border border-surface-200 bg-white p-5 shadow-xl shadow-surface-950/10 dark:border-surface-800 dark:bg-surface-900 dark:shadow-black/20">
            <div className="flex flex-col items-start justify-between gap-3 border-b border-surface-200 pb-3 dark:border-surface-800 sm:flex-row sm:items-center">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-surface-950 dark:text-white">{t('features.landing.hero.uploadWorkspace')}</p>
                <p className="mt-1 truncate text-xs text-surface-600 dark:text-surface-400">{t('features.landing.hero.reviewQueue')}</p>
              </div>
              <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                isCycleComplete
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                  : 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
              }`}>
                {isCycleComplete ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                {isCycleComplete ? t('features.landing.hero.done') : t('features.landing.hero.selectedLanguages')}
              </span>
            </div>

            <div className="mt-4 flex flex-1 flex-col">
              <div className="flex items-center justify-between text-xs text-surface-500 dark:text-surface-400">
                <span>{t('features.landing.hero.uploadProgress')}</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-100 dark:bg-surface-800">
                <div
                  className="h-full rounded-full bg-brand-600 transition-[width] duration-500 ease-out dark:bg-brand-400"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="mt-3 flex flex-1 flex-col justify-between">
                {pipelineSteps.map((step, index) => {
                  const isDone = isCycleComplete || index < activeStep
                  const isActive = !isCycleComplete && index === activeStep
                  const statusLabel = isDone
                    ? t('features.landing.hero.done')
                    : isActive
                      ? t('features.landing.hero.processing')
                      : t('features.landing.hero.waiting')

                  return (
                    <div key={step.title} className="relative flex gap-3 py-1.5">
                      {index < pipelineSteps.length - 1 ? (
                        <div className={`absolute left-[15px] top-9 h-[calc(100%-1rem)] w-px ${
                          isDone ? 'bg-brand-200 dark:bg-brand-800' : 'bg-surface-200 dark:bg-surface-800'
                        }`} />
                      ) : null}

                      <div className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-xs font-semibold transition-colors ${
                        isDone
                          ? 'border-brand-600 bg-brand-600 text-white dark:border-brand-400 dark:bg-brand-400 dark:text-surface-950'
                          : isActive
                            ? 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-300'
                            : 'border-surface-200 bg-white text-surface-400 dark:border-surface-800 dark:bg-surface-900 dark:text-surface-500'
                      }`}>
                        {isDone ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : isActive ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          index + 1
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className={`break-keep text-sm font-semibold ${
                            isActive || isDone ? 'text-surface-950 dark:text-white' : 'text-surface-600 dark:text-surface-400'
                          }`}>
                            {step.title}
                          </p>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            isDone
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : isActive
                                ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                                : 'bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400'
                          }`}>
                            {statusLabel}
                          </span>
                        </div>
                        <p className="mt-0.5 break-keep text-xs leading-4 text-surface-600 dark:text-surface-400">
                          {step.detail}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
