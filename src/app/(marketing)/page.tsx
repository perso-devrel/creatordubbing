import type { Metadata } from 'next'
import { Hero } from '@/features/landing/Hero'
import { HowItWorks } from '@/features/landing/HowItWorks'
import { FeatureShowcase } from '@/features/landing/FeatureShowcase'
import { ROICalculator } from '@/features/landing/ROICalculator'
import { PricingSection } from '@/features/landing/PricingSection'
import { CTASection } from '@/features/landing/CTASection'
import { SUPPORTED_LANGUAGE_COUNT } from '@/utils/languages'

const description = `YouTube 크리에이터를 위한 ${SUPPORTED_LANGUAGE_COUNT}개 언어 AI 더빙 및 업로드 도구.`

export const metadata: Metadata = {
  title: 'Dubtube — AI Dubbing for YouTube Creators',
  description,
  openGraph: {
    title: 'Dubtube — AI Dubbing for YouTube Creators',
    description,
    type: 'website',
    locale: 'ko_KR',
    siteName: 'Dubtube',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dubtube — AI Dubbing for YouTube Creators',
    description,
  },
  alternates: { canonical: '/' },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Dubtube',
  description,
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'KRW',
  },
}

export default function LandingPage() {
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
