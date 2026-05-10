'use client'

import { FileVideo, Languages, FileText, Upload } from 'lucide-react'
import { useLocaleText } from '@/hooks/useLocaleText'

const steps = [
  {
    icon: FileVideo,
    step: '01',
    title: 'features.landing.howItWorks.titleAddVideo',
    description: 'features.landing.howItWorks.descriptionPasteAYouTubeLinkOrUploadA',
  },
  {
    icon: Languages,
    step: '02',
    title: 'features.landing.howItWorks.titleChooseLanguages',
    description: 'features.landing.howItWorks.descriptionChooseTargetLanguagesAndReviewTitleAnd',
  },
  {
    icon: FileText,
    step: '03',
    title: 'features.landing.howItWorks.titleReviewAndEdit',
    description: 'features.landing.howItWorks.descriptionReviewEachDubCaptionTitleAndDescription',
  },
  {
    icon: Upload,
    step: '04',
    title: 'features.landing.howItWorks.titlePublishToYouTube',
    description: 'features.landing.howItWorks.descriptionDownloadFilesOrContinueDirectlyToYouTube',
  },
]

export function HowItWorks() {
  const t = useLocaleText()

  return (
    <section id="how-it-works" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="break-keep text-3xl font-bold text-surface-900 dark:text-white sm:text-4xl">
            {t('features.landing.howItWorks.startMultilingualDubbingInFourSteps')}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-surface-600 dark:text-surface-300">
            {t('features.landing.howItWorks.moveFromVideoSelectionToYouTubeUploadIn')}
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ icon: Icon, step, title, description }, i) => (
            <div key={step} className="relative text-center">
              {i < steps.length - 1 && (
                <div className="absolute left-[calc(50%+40px)] top-10 hidden h-px w-[calc(100%-80px)] bg-surface-200 dark:bg-surface-800 lg:block" />
              )}
              <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-600 dark:border-brand-900/60 dark:bg-brand-900/20 dark:text-brand-300">
                <Icon className="h-9 w-9" />
                <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-brand-600 shadow-sm dark:bg-surface-800 dark:text-brand-400">
                  {step}
                </span>
              </div>
              <h3 className="break-keep text-xl font-bold text-surface-900 dark:text-white">{t(title)}</h3>
              <p className="mt-3 text-surface-600 dark:text-surface-300">{t(description)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
