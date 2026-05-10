import type { AppLocale } from './config'
import { FALLBACK_APP_LOCALE } from './config'

export type LocalizedText = string | ({ ko: string } & Partial<Record<AppLocale, string>>)

export function text(locale: AppLocale, value: LocalizedText): string {
  if (typeof value === 'string') return value
  return value[locale] ?? value[FALLBACK_APP_LOCALE] ?? value.ko
}

export function countText(
  locale: AppLocale,
  count: number,
  unit: Record<AppLocale, string>,
): string {
  return locale === 'ko' ? `${count}${unit.ko}` : `${count} ${unit.en}`
}
