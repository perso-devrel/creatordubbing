import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { ClientMessagesProvider } from '@/lib/i18n/clientMessages'
import { appShellMessages } from '@/lib/i18n/client-messages/appShell'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClientMessagesProvider messages={appShellMessages}>
      <div className="min-h-screen">
        <Sidebar />
        <div className="lg:ml-64">
          <Topbar />
          <main className="px-4 py-5 pb-24 sm:p-6 lg:pb-6">{children}</main>
        </div>
      </div>
    </ClientMessagesProvider>
  )
}
