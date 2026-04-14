'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui'

export default function MarketingError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error('Marketing error:', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-red-500">오류</h1>
        <p className="mt-2 text-lg text-surface-500">
          페이지를 불러오는 중 문제가 발생했습니다
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button variant="secondary" onClick={() => unstable_retry()}>
            다시 시도
          </Button>
          <Link href="/">
            <Button>홈으로</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
