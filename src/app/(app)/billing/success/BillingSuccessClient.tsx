'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, Loader2, XCircle } from 'lucide-react'
import { Button, Card, CardTitle } from '@/components/ui'
import { useLocaleText } from '@/hooks/useLocaleText'

interface Props {
  paymentKey: string | null
  orderId: string | null
  amount: string | null
}

type Status = 'confirming' | 'done' | 'error'

export function BillingSuccessClient({ paymentKey, orderId, amount }: Props) {
  const t = useLocaleText()
  const hasRequiredParams = Boolean(paymentKey && orderId && amount)
  const [status, setStatus] = useState<Status>(hasRequiredParams ? 'confirming' : 'error')
  const [message, setMessage] = useState(
    hasRequiredParams
      ? t({ ko: '결제를 승인하고 더빙 시간을 충전하는 중입니다.', en: 'Confirming payment and adding dubbing minutes.' })
      : t({ ko: '결제 승인에 필요한 값이 없습니다.', en: 'Required payment confirmation values are missing.' }),
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
          setMessage(t({ ko: `${body.data.minutes}분이 충전되었습니다.`, en: `${body.data.minutes} minutes were added.` }))
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('error')
          setMessage(err instanceof Error ? err.message : t({ ko: '결제 승인에 실패했습니다.', en: 'Payment confirmation failed.' }))
        }
      }
    }

    confirm()
    return () => {
      cancelled = true
    }
  }, [paymentKey, orderId, amount, t])

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
            <CardTitle>
              {status === 'done'
                ? t({ ko: '충전 완료', en: 'Minutes added' })
                : status === 'error'
                  ? t({ ko: '결제 확인 실패', en: 'Payment confirmation failed' })
                  : t({ ko: '결제 확인 중', en: 'Confirming payment' })}
            </CardTitle>
            <p className="mt-1 text-sm text-surface-500 dark:text-surface-300">{message}</p>
          </div>
        </div>
        <Link href="/billing">
          <Button>{t({ ko: '결제 페이지로 돌아가기', en: 'Back to billing' })}</Button>
        </Link>
      </Card>
    </div>
  )
}
