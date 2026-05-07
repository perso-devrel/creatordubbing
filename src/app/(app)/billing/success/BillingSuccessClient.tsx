'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, Loader2, XCircle } from 'lucide-react'
import { Button, Card, CardTitle } from '@/components/ui'

interface Props {
  paymentKey: string | null
  orderId: string | null
  amount: string | null
}

type Status = 'confirming' | 'done' | 'error'

export function BillingSuccessClient({ paymentKey, orderId, amount }: Props) {
  const hasRequiredParams = Boolean(paymentKey && orderId && amount)
  const [status, setStatus] = useState<Status>(hasRequiredParams ? 'confirming' : 'error')
  const [message, setMessage] = useState(
    hasRequiredParams ? '결제를 승인하고 크레딧을 충전하는 중입니다.' : '결제 승인에 필요한 값이 없습니다.',
  )

  useEffect(() => {
    if (!paymentKey || !orderId || !amount) return

    let cancelled = false
    async function confirm() {
      try {
        const res = await fetch('/api/billing/toss/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentKey, orderId, amount }),
          cache: 'no-store',
        })
        const body = await res.json().catch(() => null)
        if (!body?.ok) {
          throw new Error(body?.error?.message || '결제 승인에 실패했습니다.')
        }
        if (!cancelled) {
          setStatus('done')
          setMessage(`${body.data.minutes}분이 충전되었습니다.`)
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('error')
          setMessage(err instanceof Error ? err.message : '결제 승인에 실패했습니다.')
        }
      }
    }

    confirm()
    return () => {
      cancelled = true
    }
  }, [paymentKey, orderId, amount])

  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-surface-100 p-3 dark:bg-surface-800">
            {status === 'confirming' ? (
              <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
            ) : status === 'done' ? (
              <Check className="h-6 w-6 text-emerald-500" />
            ) : (
              <XCircle className="h-6 w-6 text-red-500" />
            )}
          </div>
          <div>
            <CardTitle>{status === 'done' ? '충전 완료' : status === 'error' ? '결제 확인 실패' : '결제 확인 중'}</CardTitle>
            <p className="mt-1 text-sm text-surface-500">{message}</p>
          </div>
        </div>
        <Link href="/billing">
          <Button>결제 페이지로 돌아가기</Button>
        </Link>
      </Card>
    </div>
  )
}
