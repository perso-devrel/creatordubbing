import Link from 'next/link'
import { XCircle } from 'lucide-react'
import { Button, Card, CardTitle } from '@/components/ui'

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

export default async function BillingFailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const code = getParam(params.code)

  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-red-50 p-3 dark:bg-red-950/30">
            <XCircle className="h-6 w-6 text-red-500" />
          </div>
          <div>
            <CardTitle>결제가 완료되지 않았습니다</CardTitle>
            <p className="mt-1 text-sm text-surface-500">
              결제가 취소되었거나 처리 중 문제가 발생했습니다. 다시 시도해 주세요.
            </p>
            {code && <p className="mt-1 text-xs text-surface-400">오류 코드: {code}</p>}
          </div>
        </div>
        <Link href="/billing">
          <Button>다시 시도하기</Button>
        </Link>
      </Card>
    </div>
  )
}
