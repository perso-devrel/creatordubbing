import { APP_LOCALES, DEFAULT_APP_LOCALE, withLocalePath, type AppLocale } from '@/lib/i18n/config'

export const SITE_NAME = 'sub2tube'
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sub2tube.com').replace(/\/+$/, '')

export const MARKETING_PATHS = ['/', '/privacy', '/terms', '/support'] as const
export const APP_PATHS = [
  '/batch',
  '/billing',
  '/dashboard',
  '/dubbing',
  '/metadata',
  '/ops',
  '/settings',
  '/uploads',
  '/youtube',
] as const

export const SEO_KEYWORDS = [
  'AI dubbing',
  'YouTube dubbing',
  'YouTube localization',
  'video translation',
  'caption translation',
  'multilingual YouTube',
  'sub2tube',
]

export function absoluteUrl(path = '/'): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${SITE_URL}${normalizedPath}`
}

export function localizedMarketingAlternates(path: (typeof MARKETING_PATHS)[number]) {
  return Object.fromEntries([
    ...APP_LOCALES.map((locale) => [locale, absoluteUrl(withLocalePath(path, locale))]),
    ['x-default', absoluteUrl(withLocalePath(path, DEFAULT_APP_LOCALE))],
  ]) as Record<AppLocale | 'x-default', string>
}
