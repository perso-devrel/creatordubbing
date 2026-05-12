import type { MetadataRoute } from 'next'
import { message } from '@/lib/i18n/messages'
import { DEFAULT_APP_LOCALE } from '@/lib/i18n/config'
import { SITE_NAME } from '@/lib/seo'
import { SUPPORTED_LANGUAGE_COUNT } from '@/utils/languages'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} - YouTube AI Dubbing`,
    short_name: SITE_NAME,
    description: message(DEFAULT_APP_LOCALE, 'metadata.landing.description', { SUPPORTED_LANGUAGE_COUNT }),
    start_url: '/ko',
    scope: '/',
    display: 'standalone',
    background_color: '#0f1115',
    theme_color: '#cc0000',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}
