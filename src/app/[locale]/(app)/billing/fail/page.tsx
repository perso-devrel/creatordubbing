import { LocaleLink } from '@/components/i18n/LocaleLink'
import { XCircle } from 'lucide-react'
import { Button, Card, CardTitle } from '@/components/ui'
import { resolveAppLocale } from '@/lib/i18n/config'
import { message } from '@/lib/i18n/messages'

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

export default async function BillingFailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [routeParams, queryParams] = await Promise.all([params, searchParams])
  const locale = resolveAppLocale(routeParams.locale)
  const code = getParam(queryParams.code)

  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg bg-red-50 p-3 dark:bg-red-950/30">
            <XCircle className="h-6 w-6 text-red-500" />
          </div>
          <div>
            <CardTitle>{message(locale, 'app.app.billing.fail.page.paymentNotCompleted')}</CardTitle>
            <p className="mt-1 text-sm text-surface-600 dark:text-surface-400">
              {message(locale, 'app.app.billing.fail.page.paymentCanceledOrFailed')}
            </p>
            {code && (
              <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                {message(locale, 'app.app.billing.fail.page.supportErrorCode', { code })}
              </p>
            )}
          </div>
        </div>
        <LocaleLink href="/billing">
          <Button>{message(locale, 'app.app.billing.fail.page.tryAgain')}</Button>
        </LocaleLink>
      </Card>
    </div>
  )
}
