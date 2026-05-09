'use client'

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui'

export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error('App error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-12 text-center min-h-[60vh]">
      <AlertCircle className="h-12 w-12 text-red-500" />
      <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
        문제가 발생했습니다
      </h2>
      <p className="max-w-md text-sm text-surface-600 dark:text-surface-400">
        잠시 후 다시 시도해 주세요. 문제가 계속되면 문의해 주세요.
      </p>
      {error.digest && (
        <p className="text-xs text-surface-500 dark:text-surface-400">문의 시 전달할 오류 코드: {error.digest}</p>
      )}
      <Button variant="secondary" onClick={() => unstable_retry()}>
        다시 시도
      </Button>
    </div>
  )
}
