import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { isOperationsAdminFromCookies } from '@/lib/ops/admin'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const isOpsAdmin = await isOperationsAdminFromCookies()
  return (
    <div className="min-h-screen">
      <Sidebar isOpsAdmin={isOpsAdmin} />
      <div className="lg:ml-64">
        <Topbar isOpsAdmin={isOpsAdmin} />
        <main className="px-4 py-5 pb-24 sm:p-6 lg:pb-6">{children}</main>
      </div>
    </div>
  )
}
