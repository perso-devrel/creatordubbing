'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui'
import { useLocaleText } from '@/hooks/useLocaleText'

export default function MarketingError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  const t = useLocaleText()

  useEffect(() => {
    console.error('Marketing error:', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-red-500">{t({ ko: '오류', en: 'Error' })}</h1>
        <p className="mt-2 text-lg text-surface-600 dark:text-surface-300">
          {t({ ko: '페이지를 불러오는 중 문제가 발생했습니다', en: 'There was a problem loading this page' })}
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button variant="secondary" onClick={() => unstable_retry()}>
            {t({ ko: '다시 시도', en: 'Try again' })}
          </Button>
          <Link href="/">
            <Button>{t({ ko: '홈으로', en: 'Go home' })}</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
