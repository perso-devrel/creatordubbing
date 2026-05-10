import { redirect } from 'next/navigation'
import { resolveAppLocale } from '@/lib/i18n/config'

export default async function YouTubeSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  redirect(`/${resolveAppLocale(locale)}/settings?section=youtube`)
}
