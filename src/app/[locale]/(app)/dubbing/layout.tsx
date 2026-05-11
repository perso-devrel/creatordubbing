import type { Metadata } from 'next'
import {
  getAppRouteMetadata,
  resolveMetadataLocale,
  type LocaleMetadataProps,
} from '@/lib/i18n/metadata'
import { ClientMessagesProvider } from '@/lib/i18n/clientMessages'
import { dubbingMessages } from '@/lib/i18n/client-messages/dubbing'

export async function generateMetadata({ params }: LocaleMetadataProps): Promise<Metadata> {
  const locale = await resolveMetadataLocale(params)
  return getAppRouteMetadata(locale, 'dubbing')
}

export default function DubbingLayout({ children }: { children: React.ReactNode }) {
  return <ClientMessagesProvider messages={dubbingMessages}>{children}</ClientMessagesProvider>
}
