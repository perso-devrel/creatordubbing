'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'

const HowItWorks = dynamic(
  () => import('./HowItWorks').then((mod) => mod.HowItWorks),
  { loading: () => <LandingSectionSkeleton /> },
)
const FeatureShowcase = dynamic(
  () => import('./FeatureShowcase').then((mod) => mod.FeatureShowcase),
  { loading: () => <LandingSectionSkeleton /> },
)
const ROICalculator = dynamic(
  () => import('./ROICalculator').then((mod) => mod.ROICalculator),
  { loading: () => <LandingSectionSkeleton /> },
)
const PricingSection = dynamic(
  () => import('./PricingSection').then((mod) => mod.PricingSection),
  { loading: () => <LandingSectionSkeleton /> },
)
const CTASection = dynamic(
  () => import('./CTASection').then((mod) => mod.CTASection),
  { loading: () => <LandingSectionSkeleton /> },
)

function LandingSectionSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-24">
      <div className="mx-auto h-8 max-w-md animate-pulse rounded bg-surface-200 dark:bg-surface-800" />
      <div className="mx-auto mt-4 h-5 max-w-xl animate-pulse rounded bg-surface-100 dark:bg-surface-850" />
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-32 animate-pulse rounded-lg bg-surface-100 dark:bg-surface-850" />
        <div className="h-32 animate-pulse rounded-lg bg-surface-100 dark:bg-surface-850" />
        <div className="h-32 animate-pulse rounded-lg bg-surface-100 dark:bg-surface-850" />
      </div>
    </div>
  )
}

function LazyLandingSection({
  id,
  children,
}: {
  id?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLElement>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (isReady) return

    const node = ref.current
    if (!node) return
    if (!('IntersectionObserver' in window)) {
      const timer = globalThis.setTimeout(() => setIsReady(true), 0)
      return () => globalThis.clearTimeout(timer)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsReady(true)
          observer.disconnect()
        }
      },
      { rootMargin: '720px 0px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [isReady])

  if (isReady) {
    return children
  }

  return (
    <section ref={ref} id={id} className="min-h-[28rem]" aria-hidden>
      <LandingSectionSkeleton />
    </section>
  )
}

export function DeferredLandingSections() {
  return (
    <>
      <LazyLandingSection id="how-it-works">
        <HowItWorks />
      </LazyLandingSection>
      <LazyLandingSection id="features">
        <FeatureShowcase />
      </LazyLandingSection>
      <LazyLandingSection>
        <ROICalculator />
      </LazyLandingSection>
      <LazyLandingSection id="pricing">
        <PricingSection />
      </LazyLandingSection>
      <LazyLandingSection>
        <CTASection />
      </LazyLandingSection>
    </>
  )
}

