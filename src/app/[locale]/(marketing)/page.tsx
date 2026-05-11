import type { Metadata } from 'next'
import { Hero } from '@/features/landing/Hero'
import { DeferredLandingSections } from '@/features/landing/DeferredLandingSections'
import { ClientMessagesProvider } from '@/lib/i18n/clientMessages'
import { landingMessages } from '@/lib/i18n/client-messages/landing'
import {
  getLandingMetadata,
  getSoftwareJsonLd,
  resolveMetadataLocale,
  type LocaleMetadataProps,
} from '@/lib/i18n/metadata'

export async function generateMetadata({ params }: LocaleMetadataProps): Promise<Metadata> {
  const locale = await resolveMetadataLocale(params)
  return getLandingMetadata(locale)
}

export default async function LandingPage({ params }: LocaleMetadataProps) {
  const locale = await resolveMetadataLocale(params)
  const jsonLd = getSoftwareJsonLd(locale)

  return (
    <ClientMessagesProvider messages={landingMessages}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero />
      <DeferredLandingSections />
    </ClientMessagesProvider>
  )
}
