import type { Metadata } from 'next'
import {
  getAppRouteMetadata,
  resolveMetadataLocale,
  type LocaleMetadataProps,
} from '@/lib/i18n/metadata'
import { ClientMessagesProvider } from '@/lib/i18n/clientMessages'
import { settingsMessages } from '@/lib/i18n/client-messages/settings'
import { youtubeMessages } from '@/lib/i18n/client-messages/youtube'

const settingsRouteMessages = {
  ...settingsMessages,
  ...youtubeMessages,
}

export async function generateMetadata({ params }: LocaleMetadataProps): Promise<Metadata> {
  const locale = await resolveMetadataLocale(params)
  return getAppRouteMetadata(locale, 'settings')
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <ClientMessagesProvider messages={settingsRouteMessages}>{children}</ClientMessagesProvider>
}
