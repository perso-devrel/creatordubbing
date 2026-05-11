'use client'

import { useCallback, useEffect, useRef, type FormEvent } from 'react'
import { ChevronDown, Globe2 } from 'lucide-react'
import {
  APP_LOCALE_LABELS,
  APP_LOCALES,
  type AppLocale,
} from '@/lib/i18n/config'
import { useI18nStore } from '@/stores/i18nStore'
import { useAppLocale } from '@/hooks/useLocaleText'
import { useLocaleRouter } from '@/hooks/useLocalePath'
import { cn } from '@/utils/cn'

type AppLocaleSelectProps = {
  className?: string
}

export function AppLocaleSelect({ className }: AppLocaleSelectProps) {
  const appLocale = useAppLocale()
  const setAppLocale = useI18nStore((state) => state.setAppLocale)
  const localeRouter = useLocaleRouter()
  const selectRef = useRef<HTMLSelectElement>(null)
  const requestedLocaleRef = useRef(appLocale)

  useEffect(() => {
    requestedLocaleRef.current = appLocale
  }, [appLocale])

  const applyLocale = useCallback((nextLocale: AppLocale) => {
    if (nextLocale === requestedLocaleRef.current) return
    requestedLocaleRef.current = nextLocale
    setAppLocale(nextLocale)
    localeRouter.replaceLocale(nextLocale)
  }, [localeRouter, setAppLocale])

  useEffect(() => {
    const select = selectRef.current
    if (!select) return

    const handleNativeChange = () => applyLocale(select.value as AppLocale)
    select.addEventListener('change', handleNativeChange)
    select.addEventListener('input', handleNativeChange)
    return () => {
      select.removeEventListener('change', handleNativeChange)
      select.removeEventListener('input', handleNativeChange)
    }
  }, [applyLocale])

  const handleChange = (event: FormEvent<HTMLSelectElement>) => {
    applyLocale(event.currentTarget.value as AppLocale)
  }

  return (
    <div className={cn('relative', className)}>
      <Globe2 className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-500 dark:text-surface-300" />
      <select
        ref={selectRef}
        aria-label="Language / 언어"
        value={appLocale}
        onChange={handleChange}
        onInput={handleChange}
        className="h-9 w-full appearance-none rounded-md border border-surface-300 bg-white pl-8 pr-8 text-sm font-medium text-surface-800 transition-colors focus-ring dark:border-surface-700 dark:bg-surface-850 dark:text-surface-100"
      >
        {APP_LOCALES.map((locale) => (
          <option key={locale} value={locale}>
            {APP_LOCALE_LABELS[locale].nativeLabel}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
    </div>
  )
}
