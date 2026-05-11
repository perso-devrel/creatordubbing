'use client'

import { useEffect } from 'react'
import { LocaleLink } from '@/components/i18n/LocaleLink'
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
        <h1 className="text-6xl font-bold text-red-500">{t('app.marketing.error.error')}</h1>
        <p className="mt-2 text-lg text-surface-600 dark:text-surface-300">
          {t('app.marketing.error.thereWasAProblemLoadingThisPage')}
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button variant="secondary" onClick={() => unstable_retry()}>
            {t('app.marketing.error.tryAgain')}
          </Button>
          <LocaleLink href="/">
            <Button>{t('app.marketing.error.goHome')}</Button>
          </LocaleLink>
        </div>
      </div>
    </div>
  )
}
