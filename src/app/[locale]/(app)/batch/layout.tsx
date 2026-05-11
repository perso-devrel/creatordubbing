import type { Metadata } from 'next'
import {
  getAppRouteMetadata,
  resolveMetadataLocale,
  type LocaleMetadataProps,
} from '@/lib/i18n/metadata'
import { ClientMessagesProvider } from '@/lib/i18n/clientMessages'
import { batchMessages } from '@/lib/i18n/client-messages/batch'

export async function generateMetadata({ params }: LocaleMetadataProps): Promise<Metadata> {
  const locale = await resolveMetadataLocale(params)
  return getAppRouteMetadata(locale, 'batch')
}

export default function BatchLayout({ children }: { children: React.ReactNode }) {
  return <ClientMessagesProvider messages={batchMessages}>{children}</ClientMessagesProvider>
}
