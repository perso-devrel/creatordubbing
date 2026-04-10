import type { Metadata } from 'next'
import { Hero } from '@/features/landing/Hero'
import { HowItWorks } from '@/features/landing/HowItWorks'
import { FeatureShowcase } from '@/features/landing/FeatureShowcase'
import { ROICalculator } from '@/features/landing/ROICalculator'
import { Testimonials } from '@/features/landing/Testimonials'
import { PricingSection } from '@/features/landing/PricingSection'
import { CTASection } from '@/features/landing/CTASection'

const description =
  'Perso.ai + YouTube API 기반 크리에이터 전용 10개 언어 자동 더빙. 한 번 클릭으로 영상 글로벌화.'

export const metadata: Metadata = {
  title: 'CreatorDub — AI Dubbing for YouTube Creators',
  description,
  openGraph: {
    title: 'CreatorDub — AI Dubbing for YouTube Creators',
    description,
    type: 'website',
    locale: 'ko_KR',
    siteName: 'CreatorDub',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CreatorDub — AI Dubbing for YouTube Creators',
    description,
  },
  alternates: { canonical: '/' },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'CreatorDub',
  description,
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
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
      <Testimonials />
      <PricingSection />
      <CTASection />
    </>
  )
}
