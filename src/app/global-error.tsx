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
          <h2 className="text-xl font-semibold">{t({ ko: '예상치 못한 오류가 발생했습니다', en: 'An unexpected error occurred' })}</h2>
          <p className="max-w-md text-sm text-surface-600 dark:text-surface-300">
            {t({ ko: '잠시 후 다시 시도해 주세요. 문제가 계속되면 문의해 주세요.', en: 'Please try again in a moment. Contact support if the problem continues.' })}
          </p>
          {error.digest && (
            <p className="text-xs text-surface-500 dark:text-surface-400">
              {t({ ko: `문의 시 전달할 오류 코드: ${error.digest}`, en: `Error code for support: ${error.digest}` })}
            </p>
          )}
          <button
            onClick={() => unstable_retry()}
            className="focus-ring mt-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            {t({ ko: '다시 시도', en: 'Try again' })}
          </button>
        </div>
      </body>
    </html>
  )
}
