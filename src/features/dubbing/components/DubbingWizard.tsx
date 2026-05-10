'use client'

import { useEffect } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useLocaleText } from '@/hooks/useLocaleText'
import { useDubbingStore } from '../store/dubbingStore'
import { VideoInputStep } from './steps/VideoInputStep'
import { LanguageSelectStep } from './steps/LanguageSelectStep'
import { OutputModeStep } from './steps/OutputModeStep'
import { UploadSettingsStep } from './steps/UploadSettingsStep'
import { TranslationEditStep } from './steps/TranslationEditStep'
import { ProcessingStep } from './steps/ProcessingStep'
import { UploadStep } from './steps/UploadStep'

const steps = [
  { num: 1, label: 'features.dubbing.components.dubbingWizard.labelVideo' },
  { num: 2, label: 'features.dubbing.components.dubbingWizard.labelOutput' },
  { num: 3, label: 'features.dubbing.components.dubbingWizard.labelLanguages' },
  { num: 4, label: 'features.dubbing.components.dubbingWizard.labelPublishSettings' },
  { num: 5, label: 'features.dubbing.components.dubbingWizard.labelReview' },
  { num: 6, label: 'features.dubbing.components.dubbingWizard.labelProcessing' },
  { num: 7, label: 'features.dubbing.components.dubbingWizard.labelResults' },
] satisfies Array<{ num: number; label: string }>

export function DubbingWizard() {
  const currentStep = useDubbingStore((s) => s.currentStep)
  const t = useLocaleText()

  useEffect(() => {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    })
  }, [currentStep])

  return (
    <div className="space-y-8">
      {/* Step indicator */}
      <nav className="flex items-center justify-start gap-1 overflow-x-auto px-1 pb-1 sm:gap-2 sm:px-0 xl:justify-center">
        {steps.map(({ num, label }, i) => {
          const isActive = currentStep === num
          const isCompleted = currentStep > num
          return (
            <div key={num} className="flex shrink-0 items-center gap-1 sm:gap-2">
              <div className="flex items-center gap-1 sm:gap-2">
                <div
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all sm:h-8 sm:w-8 sm:text-sm',
                    isCompleted
                      ? 'bg-brand-600 text-white'
                      : isActive
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'bg-surface-200 text-surface-700 dark:bg-surface-800 dark:text-surface-300',
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : num}
                </div>
                <span
                  className={cn(
                    'hidden text-sm font-medium xl:block',
                    isActive ? 'text-surface-900 dark:text-white' : 'text-surface-500 dark:text-surface-300',
                  )}
                >
                  {t(label)}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 w-3 rounded-full min-[380px]:w-4 sm:w-8 xl:w-16',
                    currentStep > num ? 'bg-brand-600' : 'bg-surface-200 dark:bg-surface-800',
                  )}
                />
              )}
            </div>
          )
        })}
      </nav>

      {/* Step content */}
      <div className="animate-fade-in">
        {currentStep === 1 && <VideoInputStep />}
        {currentStep === 2 && <OutputModeStep />}
        {currentStep === 3 && <LanguageSelectStep />}
        {currentStep === 4 && <UploadSettingsStep />}
        {currentStep === 5 && <TranslationEditStep />}
        {currentStep === 6 && <ProcessingStep />}
        {currentStep === 7 && <UploadStep />}
      </div>
    </div>
  )
}
