'use client'

import { useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  getPathLocale,
  stripLocalePrefix,
  withLocalePath,
  type AppLocale,
} from '@/lib/i18n/config'
import { useAppLocale } from '@/hooks/useLocaleText'

function useCurrentRouteLocale(): AppLocale {
  const pathname = usePathname()
  const appLocale = useAppLocale()
  return getPathLocale(pathname) ?? appLocale
}

export function useLocalePath() {
  const locale = useCurrentRouteLocale()
  return useCallback((path: string) => withLocalePath(path, locale), [locale])
}

export function useLocaleRouter() {
  const router = useRouter()
  const pathname = usePathname()
  const locale = useCurrentRouteLocale()
  const localize = useLocalePath()

  const push = useCallback((path: string) => router.push(localize(path)), [localize, router])
  const replace = useCallback((path: string) => router.replace(localize(path)), [localize, router])
  const replaceLocale = useCallback((locale: AppLocale) => {
    const current = typeof window === 'undefined'
      ? pathname
      : `${window.location.pathname}${window.location.search}${window.location.hash}`
    const path = stripLocalePrefix(current || '/')
    router.replace(withLocalePath(path, locale))
  }, [pathname, router])

  return { push, replace, replaceLocale, localize, locale }
}
