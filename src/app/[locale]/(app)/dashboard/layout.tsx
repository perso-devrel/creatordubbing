import type { Metadata } from 'next'
import {
  getAppRouteMetadata,
  resolveMetadataLocale,
  type LocaleMetadataProps,
} from '@/lib/i18n/metadata'

export async function generateMetadata({ params }: LocaleMetadataProps): Promise<Metadata> {
  const locale = await resolveMetadataLocale(params)
  return getAppRouteMetadata(locale, 'dashboard')
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children
}
