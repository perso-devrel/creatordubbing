import { LandingNavBar } from '@/components/layout/LandingNavBar'
import { LandingFooter } from '@/components/layout/LandingFooter'
import { ClientMessagesProvider } from '@/lib/i18n/clientMessages'
import { marketingShellMessages } from '@/lib/i18n/client-messages/marketingShell'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClientMessagesProvider messages={marketingShellMessages}>
      <div className="min-h-screen">
        <LandingNavBar />
        {children}
        <LandingFooter />
      </div>
    </ClientMessagesProvider>
  )
}
