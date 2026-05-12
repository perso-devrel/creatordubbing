import type { MetadataRoute } from 'next'
import { APP_LOCALES, withLocalePath } from '@/lib/i18n/config'
import { APP_PATHS, SITE_URL, absoluteUrl } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/auth/',
        ...APP_LOCALES.flatMap((locale) => APP_PATHS.map((path) => withLocalePath(path, locale))),
      ],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
    host: SITE_URL,
  }
}
