'use client'

import { Globe2 } from 'lucide-react'
import { Card, CardTitle, Select } from '@/components/ui'
import {
  APP_LOCALE_LABELS,
  APP_LOCALES,
  MARKET_LANGUAGE_PRESETS,
  type AppLocale,
} from '@/lib/i18n/config'
import { useI18nStore } from '@/stores/i18nStore'
import { useYouTubeSettingsStore } from '@/stores/youtubeSettingsStore'
import { SUPPORTED_LANGUAGES, getLanguageByCode } from '@/utils/languages'

const APP_LOCALE_OPTIONS = APP_LOCALES.map((locale) => ({
  value: locale,
  label: `${APP_LOCALE_LABELS[locale].nativeLabel} / ${APP_LOCALE_LABELS[locale].label}`,
}))

export function SettingsClient() {
  const { appLocale, metadataTargetPreset, setAppLocale, setMetadataTargetPreset } = useI18nStore()
  const { defaultLanguage, setDefaultLanguage } = useYouTubeSettingsStore()
  const isEnglish = appLocale === 'en'
  const languageOptions = SUPPORTED_LANGUAGES.map((language) => ({
    value: language.code,
    label: isEnglish
      ? `${language.flag} ${language.name} (${language.nativeName})`
      : `${language.flag} ${language.nativeName} (${language.name})`,
  }))
  const presetOptions = MARKET_LANGUAGE_PRESETS.map((preset) => ({
    value: preset.id,
    label: isEnglish ? preset.labelEn : preset.labelKo,
  }))

  const selectedPreset = MARKET_LANGUAGE_PRESETS.find((preset) => preset.id === metadataTargetPreset)
  const presetLanguages = selectedPreset
    ? selectedPreset.languageCodes.map((code) => getLanguageByCode(code)).filter(Boolean)
    : []

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-300">
            <Globe2 className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>{isEnglish ? 'Language and YouTube defaults' : '언어 및 YouTube 기본값'}</CardTitle>
            <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
              {isEnglish
                ? 'Set display language and title/description translation defaults.'
                : '화면 언어와 제목·설명 번역 기본값을 정합니다.'}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label={isEnglish ? 'App locale' : '앱 언어'}
            value={appLocale}
            onChange={(event) => setAppLocale(event.target.value as AppLocale)}
            options={APP_LOCALE_OPTIONS}
          />
          <Select
            label={isEnglish ? 'Default metadata source language' : '제목·설명 작성 기본 언어'}
            value={defaultLanguage}
            onChange={(event) => setDefaultLanguage(event.target.value)}
            options={languageOptions}
          />
          <Select
            label={isEnglish ? 'Recommended language set' : '추천 대상 언어 묶음'}
            value={metadataTargetPreset}
            onChange={(event) => setMetadataTargetPreset(event.target.value)}
            options={presetOptions}
            className="md:col-span-2"
          />
        </div>

        {selectedPreset && (
          <div className="mt-4 rounded-lg border border-surface-200 bg-surface-100/70 p-3 dark:border-surface-700 dark:bg-surface-850">
            <p className="text-sm font-medium text-surface-800 dark:text-surface-100">
              {isEnglish ? selectedPreset.labelEn : selectedPreset.labelKo}
            </p>
            <p className="mt-1 text-xs leading-5 text-surface-600 dark:text-surface-300">
              {isEnglish ? selectedPreset.descriptionEn : selectedPreset.descriptionKo}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {presetLanguages.map((language) => language && (
                <span
                  key={language.code}
                  className="max-w-full rounded-full bg-white px-2.5 py-1 text-xs font-medium text-surface-700 ring-1 ring-surface-200 dark:bg-surface-900 dark:text-surface-200 dark:ring-surface-700"
                >
                  {language.flag} {isEnglish ? language.name : language.nativeName}
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
