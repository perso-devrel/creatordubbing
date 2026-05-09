'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <html lang="ko">
      <body className="min-h-full flex flex-col items-center justify-center bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <div className="flex flex-col items-center gap-4 p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold">예상치 못한 오류가 발생했습니다</h2>
          <p className="max-w-md text-sm text-gray-500 dark:text-gray-400">
            잠시 후 다시 시도해 주세요. 문제가 계속되면 문의해 주세요.
          </p>
          {error.digest && (
            <p className="text-xs text-gray-500 dark:text-gray-400">문의 시 전달할 오류 코드: {error.digest}</p>
          )}
          <button
            onClick={() => unstable_retry()}
            className="mt-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  )
}
