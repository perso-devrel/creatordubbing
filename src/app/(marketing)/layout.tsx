import { LandingNavBar } from '@/components/layout/LandingNavBar'
import { LandingFooter } from '@/components/layout/LandingFooter'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <LandingNavBar />
      {children}
      <LandingFooter />
    </div>
  )
}
