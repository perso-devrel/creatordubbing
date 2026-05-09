'use client'

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui'
import { useLocaleText } from '@/hooks/useLocaleText'

export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  const t = useLocaleText()

  useEffect(() => {
    console.error('App error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-12 text-center min-h-[60vh]">
      <AlertCircle className="h-12 w-12 text-red-500" />
      <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
        {t({ ko: '문제가 발생했습니다', en: 'Something went wrong' })}
      </h2>
      <p className="max-w-md text-sm text-surface-600 dark:text-surface-400">
        {t({ ko: '잠시 후 다시 시도해 주세요. 문제가 계속되면 문의해 주세요.', en: 'Please try again in a moment. Contact support if the problem continues.' })}
      </p>
      {error.digest && (
        <p className="text-xs text-surface-500 dark:text-surface-400">
          {t({ ko: `문의 시 전달할 오류 코드: ${error.digest}`, en: `Error code for support: ${error.digest}` })}
        </p>
      )}
      <Button variant="secondary" onClick={() => unstable_retry()}>
        {t({ ko: '다시 시도', en: 'Try again' })}
      </Button>
    </div>
  )
}
