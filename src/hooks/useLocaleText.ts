'use client'

import { useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useI18nStore } from '@/stores/i18nStore'
import { getPathLocale } from '@/lib/i18n/config'
import { text, type LocalizedText } from '@/lib/i18n/text'
import { isMessageKey, message, type MessageKey, type MessageParams } from '@/lib/i18n/messages'

export function useAppLocale() {
  const pathname = usePathname()
  const storedLocale = useI18nStore((state) => state.appLocale)
  return getPathLocale(pathname) ?? storedLocale
}

export function useLocaleText() {
  const locale = useAppLocale()
  return useCallback((value: LocalizedText | MessageKey, params?: MessageParams) => {
    if (typeof value === 'string' && isMessageKey(value)) {
      return message(locale, value, params)
    }
    return text(locale, value as LocalizedText)
  }, [locale])
}
