import type { Metadata } from 'next'
import {
  getAppRouteMetadata,
  resolveMetadataLocale,
  type LocaleMetadataProps,
} from '@/lib/i18n/metadata'
import { ClientMessagesProvider } from '@/lib/i18n/clientMessages'
import { metadataMessages } from '@/lib/i18n/client-messages/metadata'

export async function generateMetadata({ params }: LocaleMetadataProps): Promise<Metadata> {
  const locale = await resolveMetadataLocale(params)
  return getAppRouteMetadata(locale, 'metadata')
}

export default function MetadataLayout({ children }: { children: React.ReactNode }) {
  return <ClientMessagesProvider messages={metadataMessages}>{children}</ClientMessagesProvider>
}
