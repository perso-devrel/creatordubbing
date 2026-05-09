'use client'

import { Check } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useLocaleText } from '@/hooks/useLocaleText'
import type { LocalizedText } from '@/lib/i18n/text'
import { useDubbingStore } from '../store/dubbingStore'
import { VideoInputStep } from './steps/VideoInputStep'
import { LanguageSelectStep } from './steps/LanguageSelectStep'
import { OutputModeStep } from './steps/OutputModeStep'
import { UploadSettingsStep } from './steps/UploadSettingsStep'
import { TranslationEditStep } from './steps/TranslationEditStep'
import { ProcessingStep } from './steps/ProcessingStep'
import { UploadStep } from './steps/UploadStep'

const steps = [
  { num: 1, label: { ko: '영상', en: 'Video' } },
  { num: 2, label: { ko: '출력 방식', en: 'Output' } },
  { num: 3, label: { ko: '언어', en: 'Languages' } },
  { num: 4, label: { ko: '게시 설정', en: 'Publish settings' } },
  { num: 5, label: { ko: '검토', en: 'Review' } },
  { num: 6, label: { ko: '처리', en: 'Processing' } },
  { num: 7, label: { ko: '결과', en: 'Results' } },
] satisfies Array<{ num: number; label: LocalizedText }>

export function DubbingWizard() {
  const currentStep = useDubbingStore((s) => s.currentStep)
  const t = useLocaleText()

  return (
    <div className="space-y-8">
      {/* Step indicator */}
      <nav className="flex items-center justify-start gap-1 overflow-x-auto px-1 pb-1 sm:justify-center sm:gap-2 sm:overflow-visible sm:px-0 sm:pb-0">
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
                    'hidden text-sm font-medium sm:block',
                    isActive ? 'text-surface-900 dark:text-white' : 'text-surface-500 dark:text-surface-300',
                  )}
                >
                  {t(label)}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 w-3 rounded-full min-[380px]:w-4 sm:w-16',
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
