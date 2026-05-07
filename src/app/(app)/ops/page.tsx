import { notFound } from 'next/navigation'
import { OpsDashboard } from '@/features/ops/components/OpsDashboard'
import { isOperationsAdminFromCookies } from '@/lib/ops/admin'

export default async function OpsPage() {
  if (!(await isOperationsAdminFromCookies())) {
    notFound()
  }
  return <OpsDashboard />
}
