import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  DEFAULT_APP_LOCALE,
  LOCALE_COOKIE,
  resolveLocaleFromAcceptLanguage,
  resolvePreferredLocale,
} from '@/lib/i18n/config'

export default async function RootPage() {
  const [headersList, cookieStore] = await Promise.all([headers(), cookies()])
  const locale = resolvePreferredLocale(
    cookieStore.get(LOCALE_COOKIE)?.value,
    resolveLocaleFromAcceptLanguage(headersList.get('accept-language'), DEFAULT_APP_LOCALE),
  )

  redirect(`/${locale}`)
}
