'use client'

import { LocaleLink } from '@/components/i18n/LocaleLink'
import { Button } from '@/components/ui'
import { useLocaleText } from '@/hooks/useLocaleText'

export default function NotFoundPage() {
  const t = useLocaleText()

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-brand-500">404</h1>
        <p className="mt-2 text-lg text-surface-600 dark:text-surface-400">{t('app.notFound.pageNotFound')}</p>
        <LocaleLink href="/" className="mt-6 inline-block">
          <Button>{t('app.notFound.goHome')}</Button>
        </LocaleLink>
      </div>
    </div>
  )
}
