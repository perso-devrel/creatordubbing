'use client'

import dynamic from 'next/dynamic'

const HowItWorks = dynamic(
  () => import('./HowItWorks').then((mod) => mod.HowItWorks),
  { loading: () => null },
)
const FeatureShowcase = dynamic(
  () => import('./FeatureShowcase').then((mod) => mod.FeatureShowcase),
  { loading: () => null },
)
const ROICalculator = dynamic(
  () => import('./ROICalculator').then((mod) => mod.ROICalculator),
  { loading: () => null },
)
const PricingSection = dynamic(
  () => import('./PricingSection').then((mod) => mod.PricingSection),
  { loading: () => null },
)
const CTASection = dynamic(
  () => import('./CTASection').then((mod) => mod.CTASection),
  { loading: () => null },
)

export function DeferredLandingSections() {
  return (
    <>
      <HowItWorks />
      <FeatureShowcase />
      <ROICalculator />
      <PricingSection />
      <CTASection />
    </>
  )
}
