'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Check } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Progress } from '@/components/ui'
import { useLocaleText } from '@/hooks/useLocaleText'
import { useDubbingStore } from '../store/dubbingStore'

function StepLoading() {
  return (
    <div className="min-h-[24rem] rounded-lg border border-surface-200 bg-white p-6 dark:border-surface-800 dark:bg-surface-900">
      <div className="h-6 w-40 animate-pulse rounded bg-surface-200 dark:bg-surface-800" />
      <div className="mt-6 space-y-3">
        <div className="h-10 animate-pulse rounded bg-surface-100 dark:bg-surface-850" />
        <div className="h-10 animate-pulse rounded bg-surface-100 dark:bg-surface-850" />
        <div className="h-24 animate-pulse rounded bg-surface-100 dark:bg-surface-850" />
      </div>
    </div>
  )
}

const VideoInputStep = dynamic(
  () => import('./steps/VideoInputStep').then((mod) => mod.VideoInputStep),
  { loading: StepLoading },
)
const OutputModeStep = dynamic(
  () => import('./steps/OutputModeStep').then((mod) => mod.OutputModeStep),
  { loading: StepLoading },
)
const LanguageSelectStep = dynamic(
  () => import('./steps/LanguageSelectStep').then((mod) => mod.LanguageSelectStep),
  { loading: StepLoading },
)
const UploadSettingsStep = dynamic(
  () => import('./steps/UploadSettingsStep').then((mod) => mod.UploadSettingsStep),
  { loading: StepLoading },
)
const TranslationEditStep = dynamic(
  () => import('./steps/TranslationEditStep').then((mod) => mod.TranslationEditStep),
  { loading: StepLoading },
)
const ProcessingStep = dynamic(
  () => import('./steps/ProcessingStep').then((mod) => mod.ProcessingStep),
  { loading: StepLoading },
)
const UploadStep = dynamic(
  () => import('./steps/UploadStep').then((mod) => mod.UploadStep),
  { loading: StepLoading },
)

const stepPreloaders: Record<number, () => Promise<unknown>> = {
  1: () => import('./steps/VideoInputStep'),
  2: () => import('./steps/LanguageSelectStep'),
  3: () => import('./steps/OutputModeStep'),
  4: () => import('./steps/UploadSettingsStep'),
  5: () => import('./steps/TranslationEditStep'),
  6: () => import('./steps/ProcessingStep'),
  7: () => import('./steps/UploadStep'),
}

const steps = [
  { num: 1, label: 'features.dubbing.components.dubbingWizard.labelVideo' },
  { num: 2, label: 'features.dubbing.components.dubbingWizard.labelLanguages' },
  { num: 3, label: 'features.dubbing.components.dubbingWizard.labelOutput' },
  { num: 4, label: 'features.dubbing.components.dubbingWizard.labelPublishSettings' },
  { num: 5, label: 'features.dubbing.components.dubbingWizard.labelReview' },
  { num: 6, label: 'features.dubbing.components.dubbingWizard.labelProcessing' },
  { num: 7, label: 'features.dubbing.components.dubbingWizard.labelResults' },
] satisfies Array<{ num: number; label: string }>

export function DubbingWizard() {
  const currentStep = useDubbingStore((s) => s.currentStep)
  const t = useLocaleText()
  const currentStepInfo = steps.find((step) => step.num === currentStep) ?? steps[0]
  const progressValue = ((currentStep - 1) / (steps.length - 1)) * 100

  useEffect(() => {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    })
  }, [currentStep])

  useEffect(() => {
    const nextStep = currentStep + 1
    if (!stepPreloaders[nextStep]) return
    const id = window.setTimeout(() => {
      void stepPreloaders[nextStep]()
    }, 200)
    return () => window.clearTimeout(id)
  }, [currentStep])

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-surface-200 bg-white p-4 shadow-sm shadow-surface-950/[0.03] dark:border-surface-800 dark:bg-surface-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-surface-500 dark:text-surface-400">
              {currentStep} / {steps.length}
            </p>
            <p className="mt-1 break-keep text-base font-semibold text-surface-950 dark:text-white">
              {t(currentStepInfo.label)}
            </p>
          </div>
          <div className="min-w-0 text-sm text-surface-500 dark:text-surface-400">
            {t('app.app.dubbing.page.chooseAVideoAndLanguagesToStartA')}
          </div>
        </div>
        <Progress value={progressValue} className="mt-4" />
        <nav className="mt-4 grid gap-2 sm:grid-cols-4 xl:grid-cols-7" aria-label="Dubbing steps">
          {steps.map(({ num, label }) => {
            const isActive = currentStep === num
            const isCompleted = currentStep > num
            return (
              <div
                key={num}
                className={cn(
                  'flex min-w-0 items-center gap-2 rounded-md border px-2.5 py-2 text-xs transition-colors',
                  isActive
                    ? 'border-brand-200 bg-brand-50 text-brand-800 dark:border-brand-900/70 dark:bg-brand-900/25 dark:text-brand-200'
                    : isCompleted
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-900/20 dark:text-emerald-300'
                      : 'border-surface-200 bg-surface-50 text-surface-500 dark:border-surface-800 dark:bg-surface-850 dark:text-surface-400',
                )}
              >
                <span className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-semibold',
                  isActive
                    ? 'bg-brand-600 text-white'
                    : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-surface-500 dark:bg-surface-900 dark:text-surface-400',
                )}>
                  {isCompleted ? <Check className="h-3 w-3" /> : num}
                </span>
                <span className="truncate font-semibold">{t(label)}</span>
              </div>
            )
          })}
        </nav>
      </div>

      {/* Step content */}
      <div className="animate-fade-in">
        {currentStep === 1 && <VideoInputStep />}
        {currentStep === 2 && <LanguageSelectStep />}
        {currentStep === 3 && <OutputModeStep />}
        {currentStep === 4 && <UploadSettingsStep />}
        {currentStep === 5 && <TranslationEditStep />}
        {currentStep === 6 && <ProcessingStep />}
        {currentStep === 7 && <UploadStep />}
      </div>
    </div>
  )
}
