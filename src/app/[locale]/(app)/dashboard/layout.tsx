import type { Metadata } from 'next'
import {
  getAppRouteMetadata,
  resolveMetadataLocale,
  type LocaleMetadataProps,
} from '@/lib/i18n/metadata'
import { ClientMessagesProvider } from '@/lib/i18n/clientMessages'
import { dashboardMessages } from '@/lib/i18n/client-messages/dashboard'

export async function generateMetadata({ params }: LocaleMetadataProps): Promise<Metadata> {
  const locale = await resolveMetadataLocale(params)
  return getAppRouteMetadata(locale, 'dashboard')
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <ClientMessagesProvider messages={dashboardMessages}>{children}</ClientMessagesProvider>
}
