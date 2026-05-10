'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Search, X } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { cn } from '@/utils/cn'
import { useAppLocale, useLocaleText } from '@/hooks/useLocaleText'

import {
  REGION_LABELS,
  SUPPORTED_LANGUAGES,
  getLanguageByCode,
  type LanguageRegion,
} from '@/utils/languages'
import { useDubbingStore } from '../../store/dubbingStore'
import { countMessage } from '@/lib/i18n/messages'

type RegionFilter = 'all' | LanguageRegion

export function LanguageSelectStep() {
  const {
    selectedLanguages,
    toggleLanguage,
    deliverableMode,
    prevStep,
    nextStep,
  } = useDubbingStore()
  const locale = useAppLocale()
  const t = useLocaleText()

  const [region, setRegion] = useState<RegionFilter>('popular')
  const [query, setQuery] = useState('')
  const regionTabs: { id: RegionFilter; label: string }[] = useMemo(() => [
    { id: 'all', label: t('features.dubbing.components.steps.languageSelectStep.all') },
    { id: 'popular', label: locale === 'ko' ? REGION_LABELS.popular : 'Popular' },
    { id: 'asia', label: locale === 'ko' ? REGION_LABELS.asia : 'Asia' },
    { id: 'europe', label: locale === 'ko' ? REGION_LABELS.europe : 'Europe' },
    { id: 'middle-east', label: locale === 'ko' ? REGION_LABELS['middle-east'] : 'Middle East' },
  ], [locale, t])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return SUPPORTED_LANGUAGES.filter((l) => {
      if (q) {
        return (
          l.code.toLowerCase().includes(q) ||
          l.name.toLowerCase().includes(q) ||
          l.nativeName.toLowerCase().includes(q)
        )
      }
      return region === 'all' ? true : l.region === region
    })
  }, [region, query])

  const estimatedMinutes = selectedLanguages.length * 15
  const selectionDescription = deliverableMode === 'originalWithMultiAudio'
    ? t('features.dubbing.components.steps.languageSelectStep.chooseTheLanguagesForTranslatedCaptions')
    : t('features.dubbing.components.steps.languageSelectStep.chooseTheLanguagesToDubInto')

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-surface-900 dark:text-white">{t('features.dubbing.components.steps.languageSelectStep.chooseTargetLanguages')}</h2>
        <p className="mt-1 text-surface-600 dark:text-surface-400">
          {selectionDescription} ({countMessage(locale, selectedLanguages.length, 'features.dubbing.components.steps.languageSelectStep.unitSelected')})
        </p>
      </div>

      {/* Selected chips */}
      {selectedLanguages.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedLanguages.map((code) => {
            const lang = getLanguageByCode(code)
            if (!lang) return null
            return (
              <button
                key={code}
                onClick={() => toggleLanguage(code)}
                className="inline-flex items-center gap-1.5 rounded-full border border-brand-500 bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700 transition hover:bg-brand-100 dark:bg-brand-900/30 dark:text-brand-200 dark:hover:bg-brand-900/50"
              >
                <span>{lang.flag}</span>
                <span>{locale === 'ko' ? lang.nativeName : lang.name}</span>
                <X className="h-3.5 w-3.5" />
              </button>
            )
          })}
        </div>
      )}

      {/* Search + region tabs */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('features.dubbing.components.steps.languageSelectStep.searchLanguages')}
            className="w-full rounded-md border border-surface-300 bg-white py-2 pl-9 pr-9 text-sm text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-900 dark:text-white"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {!query && (
          <div className="flex flex-wrap gap-2">
            {regionTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRegion(tab.id)}
                className={cn(
                  'rounded-full px-3 py-1 text-sm font-medium transition',
                  region === tab.id
                    ? 'bg-brand-600 text-white'
                    : 'bg-surface-100 text-surface-700 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Language grid */}
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-surface-500 dark:text-surface-300">
          {t('features.dubbing.components.steps.languageSelectStep.noMatchingLanguages')}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {filtered.map((lang) => {
            const isSelected = selectedLanguages.includes(lang.code)
            return (
              <button
                key={lang.code}
                onClick={() => toggleLanguage(lang.code)}
                className={cn(
                  'relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all cursor-pointer',
                  isSelected
                    ? 'border-brand-600 bg-brand-50 shadow-sm dark:bg-brand-900/20'
                    : 'border-surface-200 bg-white hover:border-surface-300 dark:border-surface-800 dark:bg-surface-900 dark:hover:border-surface-700',
                )}
              >
                {isSelected && (
                  <div className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white">
                    <Check className="h-3 w-3" />
                  </div>
                )}
                <span className="text-2xl">{lang.flag}</span>
                <span className="text-sm font-medium text-surface-900 dark:text-white">
                  {locale === 'ko' ? lang.nativeName : lang.name}
                </span>
                <span className="max-w-full truncate text-xs text-surface-500 dark:text-surface-400">
                  {locale === 'ko' ? lang.name : lang.nativeName}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Dub options */}
      <Card>
        <div className="rounded-lg bg-surface-50 p-3 dark:bg-surface-800">
          <div className="flex items-center justify-between text-sm">
            <span className="text-surface-600 dark:text-surface-400">{t('features.dubbing.components.steps.languageSelectStep.referenceEstimate')}</span>
            <span className="whitespace-nowrap font-bold text-surface-900 dark:text-white">{countMessage(locale, estimatedMinutes, 'features.dubbing.components.steps.languageSelectStep.unitMin')}</span>
          </div>
        </div>
      </Card>

      <div className="flex justify-between">
        <Button variant="secondary" onClick={prevStep}>
          <ArrowLeft className="h-4 w-4" />
          {t('features.dubbing.components.steps.languageSelectStep.back')}
        </Button>
        <Button onClick={nextStep} disabled={selectedLanguages.length === 0}>
          {deliverableMode === 'downloadOnly'
            ? t('features.dubbing.components.steps.languageSelectStep.nextReviewSettings')
            : t('features.dubbing.components.steps.languageSelectStep.nextUploadSettings')}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
