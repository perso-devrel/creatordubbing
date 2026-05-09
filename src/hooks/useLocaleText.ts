'use client'

import { useCallback } from 'react'
import { useI18nStore } from '@/stores/i18nStore'
import { text, type LocalizedText } from '@/lib/i18n/text'

export function useAppLocale() {
  return useI18nStore((state) => state.appLocale)
}

export function useLocaleText() {
  const locale = useAppLocale()
  return useCallback((value: LocalizedText) => text(locale, value), [locale])
}
