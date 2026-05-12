'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Globe, Languages, Loader2, UploadCloud } from 'lucide-react'
import { HeroUrlInput } from './HeroUrlInput'
import { SUPPORTED_LANGUAGE_COUNT } from '@/utils/languages'
import { useLocaleText } from '@/hooks/useLocaleText'

const STEP_ADVANCE_DELAY_MS = 4000
const COMPLETED_PAUSE_MS = 10000

export function Hero() {
  const t = useLocaleText()
  const pipelineSteps = useMemo(
    () => [
      {
        title: t('features.landing.hero.pipelineSourceVideo'),
        detail: t('features.landing.hero.pipelineSourceVideoDetail'),
      },
      {
        title: t('features.landing.hero.pipelineOutputMode'),
        detail: t('features.landing.hero.pipelineOutputModeDetail'),
      },
      {
        title: t('features.landing.hero.pipelineLanguages'),
        detail: t('features.landing.hero.pipelineLanguagesDetail'),
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
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#f7f8fa_100%)] dark:bg-[linear-gradient(180deg,#0f1115_0%,#171a21_100%)]" />

      <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-20 lg:pt-28">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_480px]">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-4 py-1.5 text-sm font-medium text-brand-700 shadow-sm dark:border-brand-900/60 dark:bg-surface-900 dark:text-brand-300">
              <Languages className="h-3.5 w-3.5" />
              {t('features.landing.hero.youTubeVideoLocalization')}
            </div>

            <h1 className="max-w-3xl whitespace-pre-line break-keep text-5xl font-extrabold leading-[1.1] text-surface-950 dark:text-white sm:text-6xl lg:text-7xl">
              {t('features.landing.hero.createMultilingualDubsFromOneVideo')}
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-surface-600 dark:text-surface-300 sm:text-xl">
              {t('features.landing.hero.addAYouTubeLinkOrFileChooseLanguages')}
            </p>

            <HeroUrlInput />

            <div className="mt-10 grid max-w-2xl gap-4 sm:grid-cols-3">
              {[
                {
                  icon: Globe,
                  label: t('features.landing.hero.valueSupportedLanguages', { SUPPORTED_LANGUAGE_COUNT: SUPPORTED_LANGUAGE_COUNT }),
                  desc: t('features.landing.hero.dubsCaptionsMetadata'),
                },
                {
                  icon: UploadCloud,
                  label: t('features.landing.hero.youTubeUploadSupport'),
                  desc: t('features.landing.hero.privacyAndDisclosureChecks'),
                },
                {
                  icon: CheckCircle2,
                  label: t('features.landing.hero.reviewBeforePublishing'),
                  desc: t('features.landing.hero.checkEachLanguageResult'),
                },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="rounded-lg border border-surface-200 bg-white p-4 shadow-sm dark:border-surface-800 dark:bg-surface-900">
                  <Icon className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                  <div className="mt-3 text-sm font-semibold text-surface-950 dark:text-white">{label}</div>
                  <div className="mt-1 text-xs leading-5 text-surface-600 dark:text-surface-400">{desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-surface-200 bg-white p-5 shadow-xl shadow-surface-200/60 dark:border-surface-800 dark:bg-surface-900 dark:shadow-black/20">
            <div className="flex items-center justify-between border-b border-surface-200 pb-4 dark:border-surface-800">
              <div>
                <p className="text-sm font-semibold text-surface-950 dark:text-white">{t('features.landing.hero.localizationJob')}</p>
                <p className="mt-1 text-xs text-surface-600 dark:text-surface-400">{t('features.landing.hero.youTubeVideo0842')}</p>
              </div>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                isCycleComplete
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                  : 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
              }`}>
                {isCycleComplete ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                {isCycleComplete ? t('features.landing.hero.done') : t('features.landing.hero.processing')}
              </span>
            </div>

            <div className="mt-5">
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-100 dark:bg-surface-800">
                <div
                  className="h-full rounded-full bg-brand-600 transition-[width] duration-500 ease-out dark:bg-brand-400"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="mt-5 space-y-1">
                {pipelineSteps.map((step, index) => {
                  const isDone = isCycleComplete || index < activeStep
                  const isActive = !isCycleComplete && index === activeStep
                  const statusLabel = isDone
                    ? t('features.landing.hero.done')
                    : isActive
                      ? t('features.landing.hero.processing')
                      : t('features.landing.hero.waiting')

                  return (
                    <div key={step.title} className="relative flex gap-3 py-2.5">
                      {index < pipelineSteps.length - 1 ? (
                        <div className={`absolute left-4.25 top-10 h-[calc(100%-1.5rem)] w-px ${
                          isDone ? 'bg-brand-200 dark:bg-brand-800' : 'bg-surface-200 dark:bg-surface-800'
                        }`} />
                      ) : null}

                      <div className={`z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${
                        isDone
                          ? 'border-brand-600 bg-brand-600 text-white dark:border-brand-400 dark:bg-brand-400 dark:text-surface-950'
                          : isActive
                            ? 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-300'
                            : 'border-surface-200 bg-white text-surface-400 dark:border-surface-800 dark:bg-surface-900 dark:text-surface-500'
                      }`}>
                        {isDone ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : isActive ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
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
                        <p className="mt-1 break-keep text-xs leading-5 text-surface-600 dark:text-surface-400">
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
