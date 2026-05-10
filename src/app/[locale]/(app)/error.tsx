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
        {t('app.app.error.somethingWentWrong')}
      </h2>
      <p className="max-w-md text-sm text-surface-600 dark:text-surface-400">
        {t('app.app.error.pleaseTryAgainInAMomentContactSupport')}
      </p>
      {error.digest && (
        <p className="text-xs text-surface-500 dark:text-surface-400">
          {t('app.app.error.errorCodeForSupportValue', { errorDigest: error.digest })}
        </p>
      )}
      <Button variant="secondary" onClick={() => unstable_retry()}>
        {t('app.app.error.tryAgain')}
      </Button>
    </div>
  )
}
