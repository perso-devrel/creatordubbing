export const APP_LOCALES = ['ko', 'en'] as const

export type AppLocale = (typeof APP_LOCALES)[number]

export const DEFAULT_APP_LOCALE: AppLocale = 'ko'
export const FALLBACK_APP_LOCALE: AppLocale = 'en'
export const LOCALE_COOKIE = 'dubtube_locale'
export const LOCALE_HEADER = 'x-dubtube-locale'
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export const APP_LOCALE_LABELS: Record<AppLocale, { label: string; nativeLabel: string }> = {
  ko: { label: 'Korean', nativeLabel: '한국어' },
  en: { label: 'English', nativeLabel: 'English' },
}

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return APP_LOCALES.includes(value as AppLocale)
}

export function resolveAppLocale(value: string | null | undefined): AppLocale {
  return isAppLocale(value) ? value : DEFAULT_APP_LOCALE
}

export function resolvePreferredLocale(
  value: string | null | undefined,
  fallback: AppLocale = DEFAULT_APP_LOCALE,
): AppLocale {
  if (!value) return fallback
  const normalized = value.toLowerCase()
  const direct = APP_LOCALES.find((locale) => locale === normalized)
  if (direct) return direct
  const base = normalized.split('-')[0]
  return APP_LOCALES.find((locale) => locale === base) ?? fallback
}

export function resolveLocaleFromAcceptLanguage(
  acceptLanguage: string | null | undefined,
  fallback: AppLocale = DEFAULT_APP_LOCALE,
): AppLocale {
  if (!acceptLanguage) return fallback

  const candidates = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag, qValue] = part.trim().split(';q=')
      const quality = qValue ? Number.parseFloat(qValue) : 1
      return { tag, quality: Number.isFinite(quality) ? quality : 0 }
    })
    .filter((candidate) => candidate.tag)
    .sort((a, b) => b.quality - a.quality)

  for (const candidate of candidates) {
    const locale = resolvePreferredLocale(candidate.tag, fallback)
    if (locale !== fallback || candidate.tag.toLowerCase().startsWith(fallback)) {
      return locale
    }
  }

  return fallback
}

export function getPathLocale(pathname: string | null | undefined): AppLocale | null {
  if (!pathname) return null
  const segment = pathname.split('/').filter(Boolean)[0]
  return isAppLocale(segment) ? segment : null
}

export function stripLocalePrefix(pathname: string): string {
  const parts = pathname.split('/')
  const first = parts[1]
  if (!isAppLocale(first)) return pathname || '/'
  const stripped = `/${parts.slice(2).join('/')}`
  return stripped === '/' ? '/' : stripped.replace(/\/$/, '') || '/'
}

export function withLocalePath(path: string, locale: AppLocale): string {
  if (!path || path === '/') return `/${locale}`
  if (/^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith('#')) return path

  const [pathWithoutHash, hash = ''] = path.split('#')
  const [pathname, query = ''] = pathWithoutHash.split('?')
  const normalizedPath = stripLocalePrefix(pathname.startsWith('/') ? pathname : `/${pathname}`)
  const localized = normalizedPath === '/' ? `/${locale}` : `/${locale}${normalizedPath}`
  return `${localized}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`
}

export interface MarketLanguagePreset {
  id: string
  labelKey: string
  descriptionKey: string
  languageCodes: string[]
}

export const MARKET_LANGUAGE_PRESETS: MarketLanguagePreset[] = [
  {
    id: 'core',
    labelKey: 'marketPreset.core.label',
    descriptionKey: 'marketPreset.core.description',
    languageCodes: ['ko', 'en'],
  },
  {
    id: 'creator-growth',
    labelKey: 'marketPreset.creatorGrowth.label',
    descriptionKey: 'marketPreset.creatorGrowth.description',
    languageCodes: ['en', 'ja', 'es', 'pt', 'id', 'vi', 'th', 'hi'],
  },
  {
    id: 'global-broad',
    labelKey: 'marketPreset.globalBroad.label',
    descriptionKey: 'marketPreset.globalBroad.description',
    languageCodes: ['en', 'ja', 'es', 'pt', 'fr', 'de', 'id', 'vi', 'th', 'hi', 'ar'],
  },
]

export const DEFAULT_METADATA_TARGET_PRESET = 'creator-growth'

export function getMarketLanguagePreset(id: string): MarketLanguagePreset {
  return (
    MARKET_LANGUAGE_PRESETS.find((preset) => preset.id === id) ??
    MARKET_LANGUAGE_PRESETS.find((preset) => preset.id === DEFAULT_METADATA_TARGET_PRESET) ??
    MARKET_LANGUAGE_PRESETS[0]
  )
}
