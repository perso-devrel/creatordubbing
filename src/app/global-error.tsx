'use client'

import { useEffect } from 'react'
import { useAppLocale, useLocaleText } from '@/hooks/useLocaleText'

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  const locale = useAppLocale()
  const t = useLocaleText()

  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <html lang={locale}>
      <body className="flex min-h-full flex-col items-center justify-center bg-surface-50 text-surface-900 dark:bg-surface-950 dark:text-surface-100">
        <div className="flex flex-col items-center gap-4 p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold">{t('app.globalError.anUnexpectedErrorOccurred')}</h2>
          <p className="max-w-md text-sm text-surface-600 dark:text-surface-300">
            {t('app.globalError.pleaseTryAgainInAMomentContactSupport')}
          </p>
          {error.digest && (
            <p className="text-xs text-surface-500 dark:text-surface-400">
              {t('app.globalError.errorCodeForSupportValue', { errorDigest: error.digest })}
            </p>
          )}
          <button
            onClick={() => unstable_retry()}
            className="focus-ring mt-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            {t('app.globalError.tryAgain')}
          </button>
        </div>
      </body>
    </html>
  )
}
