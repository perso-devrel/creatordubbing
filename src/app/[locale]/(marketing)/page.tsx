import type { Metadata } from 'next'
import { Hero } from '@/features/landing/Hero'
import { HowItWorks } from '@/features/landing/HowItWorks'
import { FeatureShowcase } from '@/features/landing/FeatureShowcase'
import { ROICalculator } from '@/features/landing/ROICalculator'
import { PricingSection } from '@/features/landing/PricingSection'
import { CTASection } from '@/features/landing/CTASection'
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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero />
      <HowItWorks />
      <FeatureShowcase />
      <ROICalculator />
      <PricingSection />
      <CTASection />
    </>
  )
}
