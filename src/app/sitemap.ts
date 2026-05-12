import type { MetadataRoute } from 'next'
import { APP_LOCALES, withLocalePath } from '@/lib/i18n/config'
import { MARKETING_PATHS, absoluteUrl, localizedMarketingAlternates } from '@/lib/seo'

const PRIORITY_BY_PATH: Record<(typeof MARKETING_PATHS)[number], number> = {
  '/': 1,
  '/privacy': 0.4,
  '/terms': 0.4,
  '/support': 0.5,
}

export default function sitemap(): MetadataRoute.Sitemap {
  return APP_LOCALES.flatMap((locale) => (
    MARKETING_PATHS.map((path) => ({
      url: absoluteUrl(withLocalePath(path, locale)),
      lastModified: new Date(),
      changeFrequency: path === '/' ? 'weekly' as const : 'monthly' as const,
      priority: PRIORITY_BY_PATH[path],
      alternates: {
        languages: localizedMarketingAlternates(path),
      },
    }))
  ))
}
