'use client'

import { CheckCircle2, Globe, Languages, PlayCircle, UploadCloud } from 'lucide-react'
import { HeroUrlInput } from './HeroUrlInput'
import { SUPPORTED_LANGUAGE_COUNT } from '@/utils/languages'
import { useLocaleText } from '@/hooks/useLocaleText'

export function Hero() {
  const t = useLocaleText()

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

            <h1 className="max-w-3xl break-keep text-5xl font-extrabold leading-[1.1] text-surface-950 dark:text-white sm:text-6xl lg:text-7xl">
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
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                {t('features.landing.hero.ready')}
              </span>
            </div>

            <div className="mt-5 space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-surface-200 p-3 dark:border-surface-800">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
                  <PlayCircle className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-surface-950 dark:text-white">{t('features.landing.hero.importSourceVideo')}</p>
                  <p className="text-xs text-surface-600 dark:text-surface-400">{t('features.landing.hero.youTubeLinkOrFileUpload')}</p>
                </div>
              </div>

              {[
                [t('features.landing.hero.spanish'), t('features.landing.hero.dubbedVideoCaptionsTitleTranslation')],
                [t('features.landing.hero.japanese'), t('features.landing.hero.dubbedVideoCaptionsTitleTranslation2')],
                [t('features.landing.hero.english'), t('features.landing.hero.dubbedVideoCaptionsTitleTranslation3')],
              ].map(([lang, detail]) => (
                <div key={lang} className="flex items-center justify-between rounded-lg border border-surface-200 bg-surface-100/70 px-3 py-2.5 dark:border-surface-700 dark:bg-surface-850">
                  <div>
                    <p className="text-sm font-medium text-surface-900 dark:text-surface-100">{lang}</p>
                    <p className="text-xs text-surface-600 dark:text-surface-300">{detail}</p>
                  </div>
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">{t('features.landing.hero.done')}</span>
                </div>
              ))}

              <div className="rounded-lg bg-surface-950 p-4 text-white dark:bg-black">
                <p className="text-sm font-semibold">{t('features.landing.hero.youTubeUploadSettings')}</p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-surface-300">
                  <span>{t('features.landing.hero.visibilityPrivate')}</span>
                  <span>{t('features.landing.hero.aIVoiceOn')}</span>
                  <span>{t('features.landing.hero.captionsOn')}</span>
                  <span>{t('features.landing.hero.sourceLinkAdded')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
