import { notFound } from 'next/navigation'
import { APP_LOCALES, isAppLocale } from '@/lib/i18n/config'

export function generateStaticParams() {
  return APP_LOCALES.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isAppLocale(locale)) notFound()

  return children
}
