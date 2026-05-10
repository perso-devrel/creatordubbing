'use client'

import { Globe2 } from 'lucide-react'
import { Card, CardTitle, Select } from '@/components/ui'
import {
  APP_LOCALE_LABELS,
  APP_LOCALES,
  MARKET_LANGUAGE_PRESETS,
  type AppLocale,
} from '@/lib/i18n/config'
import { message, type MessageKey } from '@/lib/i18n/messages'
import { useI18nStore } from '@/stores/i18nStore'
import { useYouTubeSettingsStore } from '@/stores/youtubeSettingsStore'
import { SUPPORTED_LANGUAGES, getLanguageByCode } from '@/utils/languages'
import { useAppLocale } from '@/hooks/useLocaleText'
import { useLocaleRouter } from '@/hooks/useLocalePath'

const APP_LOCALE_OPTIONS = APP_LOCALES.map((locale) => ({
  value: locale,
  label: `${APP_LOCALE_LABELS[locale].nativeLabel} / ${APP_LOCALE_LABELS[locale].label}`,
}))

export function SettingsClient() {
  const { metadataTargetPreset, setAppLocale, setMetadataTargetPreset } = useI18nStore()
  const appLocale = useAppLocale()
  const { defaultLanguage, setDefaultLanguage } = useYouTubeSettingsStore()
  const localeRouter = useLocaleRouter()
  const isEnglish = appLocale === 'en'
  const languageOptions = SUPPORTED_LANGUAGES.map((language) => ({
    value: language.code,
    label: isEnglish
      ? `${language.flag} ${language.name} (${language.nativeName})`
      : `${language.flag} ${language.nativeName} (${language.name})`,
  }))
  const presetOptions = MARKET_LANGUAGE_PRESETS.map((preset) => ({
    value: preset.id,
    label: message(appLocale, preset.labelKey as MessageKey),
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
            <CardTitle>{message(appLocale, 'settings.languageDefaults.title')}</CardTitle>
            <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
              {message(appLocale, 'settings.languageDefaults.description')}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label={message(appLocale, 'settings.appLocale')}
            value={appLocale}
            onChange={(event) => {
              const nextLocale = event.target.value as AppLocale
              setAppLocale(nextLocale)
              localeRouter.replaceLocale(nextLocale)
            }}
            options={APP_LOCALE_OPTIONS}
          />
          <Select
            label={message(appLocale, 'settings.metadataLanguage')}
            value={defaultLanguage}
            onChange={(event) => setDefaultLanguage(event.target.value)}
            options={languageOptions}
          />
          <Select
            label={message(appLocale, 'settings.recommendedLanguageSet')}
            value={metadataTargetPreset}
            onChange={(event) => setMetadataTargetPreset(event.target.value)}
            options={presetOptions}
            className="md:col-span-2"
          />
        </div>

        {selectedPreset && (
          <div className="mt-4 rounded-lg border border-surface-200 bg-surface-100/70 p-3 dark:border-surface-700 dark:bg-surface-850">
            <p className="text-sm font-medium text-surface-800 dark:text-surface-100">
              {message(appLocale, selectedPreset.labelKey as MessageKey)}
            </p>
            <p className="mt-1 text-xs leading-5 text-surface-600 dark:text-surface-300">
              {message(appLocale, selectedPreset.descriptionKey as MessageKey)}
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
