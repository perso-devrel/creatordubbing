import type { AppLocale } from './config'

export type LocalizedText = string | Record<AppLocale, string>

export function text(locale: AppLocale, value: LocalizedText): string {
  return typeof value === 'string' ? value : value[locale] ?? value.ko
}

export function countText(
  locale: AppLocale,
  count: number,
  unit: Record<AppLocale, string>,
): string {
  return locale === 'ko' ? `${count}${unit.ko}` : `${count} ${unit.en}`
}
