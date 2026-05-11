import type { Metadata } from 'next'
import {
  getAppRouteMetadata,
  resolveMetadataLocale,
  type LocaleMetadataProps,
} from '@/lib/i18n/metadata'
import { ClientMessagesProvider } from '@/lib/i18n/clientMessages'
import { youtubeMessages } from '@/lib/i18n/client-messages/youtube'

export async function generateMetadata({ params }: LocaleMetadataProps): Promise<Metadata> {
  const locale = await resolveMetadataLocale(params)
  return getAppRouteMetadata(locale, 'youtube')
}

export default function YouTubeLayout({ children }: { children: React.ReactNode }) {
  return <ClientMessagesProvider messages={youtubeMessages}>{children}</ClientMessagesProvider>
}
