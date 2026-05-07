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
      <div className="ml-64">
        <Topbar />
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
