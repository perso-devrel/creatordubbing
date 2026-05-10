'use client'

import { Mic, Subtitles, Clock, BarChart3 } from 'lucide-react'
import { useLocaleText } from '@/hooks/useLocaleText'

const features = [
  {
    icon: Mic,
    title: 'features.landing.featureShowcase.titleDubsCloseToTheOriginalTone',
    description: 'features.landing.featureShowcase.descriptionGenerateDubsThatPreserveTheFeelOf',
  },
  {
    icon: Subtitles,
    title: 'features.landing.featureShowcase.titleLocalizedTitlesAndDescriptions',
    description: 'features.landing.featureShowcase.descriptionPrepareYouTubeTitlesDescriptionsAndCaptionsFor',
  },
  // Lip sync feature is temporarily hidden from the landing page.
  // {
  //   icon: Wand2,
  //   title: '립싱크',
  //   description: '선택적 AI 립싱크로 실사 영상에 최적화. 입 모양이 더빙 오디오와 완벽하게 맞습니다.',
  // },
  {
    icon: Clock,
    title: 'features.landing.featureShowcase.titleManageCompletedFiles',
    description: 'features.landing.featureShowcase.descriptionTrackProgressAndOpenCompletedFilesFrom',
  },
  {
    icon: BarChart3,
    title: 'features.landing.featureShowcase.titlePerformanceByLanguage',
    description: 'features.landing.featureShowcase.descriptionReviewHowEachUploadedDubPerformsAnd',
  },
]

export function FeatureShowcase() {
  const t = useLocaleText()

  return (
    <section id="features" className="border-y border-surface-200/70 bg-white py-24 dark:border-surface-800 dark:bg-surface-950">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-surface-900 dark:text-white sm:text-4xl">
            {t('features.landing.featureShowcase.oneWorkflowFromDubbingToPublishing')}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-surface-600 dark:text-surface-300">
            {t('features.landing.featureShowcase.organizeDubbingCaptionsTitlesAndDescriptionsInOne')}
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="group rounded-lg border border-surface-200 bg-white p-6 shadow-sm transition-colors hover:border-brand-300 dark:border-surface-800 dark:bg-surface-900 dark:hover:border-brand-700"
            >
              <div className="mb-4 inline-flex rounded-lg bg-brand-50 p-3 text-brand-600 transition-colors group-hover:bg-brand-100 dark:bg-brand-900/20 dark:text-brand-400">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="break-keep text-lg font-semibold text-surface-900 dark:text-white">{t(title)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-surface-600 dark:text-surface-300">{t(description)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
