import type { Metadata } from 'next'
import {
  getAppRouteMetadata,
  resolveMetadataLocale,
  type LocaleMetadataProps,
} from '@/lib/i18n/metadata'
import { ClientMessagesProvider } from '@/lib/i18n/clientMessages'
import { billingMessages } from '@/lib/i18n/client-messages/billing'

export async function generateMetadata({ params }: LocaleMetadataProps): Promise<Metadata> {
  const locale = await resolveMetadataLocale(params)
  return getAppRouteMetadata(locale, 'billing')
}

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return <ClientMessagesProvider messages={billingMessages}>{children}</ClientMessagesProvider>
}
