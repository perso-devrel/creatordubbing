import type { Metadata } from 'next'
import {
  getAppRouteMetadata,
  resolveMetadataLocale,
  type LocaleMetadataProps,
} from '@/lib/i18n/metadata'
import { ClientMessagesProvider } from '@/lib/i18n/clientMessages'
import { opsMessages } from '@/lib/i18n/client-messages/ops'

export async function generateMetadata({ params }: LocaleMetadataProps): Promise<Metadata> {
  const locale = await resolveMetadataLocale(params)
  return getAppRouteMetadata(locale, 'ops')
}

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  return <ClientMessagesProvider messages={opsMessages}>{children}</ClientMessagesProvider>
}
