export const APP_LOCALES = ['ko', 'en'] as const

export type AppLocale = (typeof APP_LOCALES)[number]

export const DEFAULT_APP_LOCALE: AppLocale = 'ko'

export const APP_LOCALE_LABELS: Record<AppLocale, { label: string; nativeLabel: string }> = {
  ko: { label: 'Korean', nativeLabel: '한국어' },
  en: { label: 'English', nativeLabel: 'English' },
}

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return APP_LOCALES.includes(value as AppLocale)
}

export function resolveAppLocale(value: string | null | undefined): AppLocale {
  return isAppLocale(value) ? value : DEFAULT_APP_LOCALE
}

export interface MarketLanguagePreset {
  id: string
  labelKo: string
  labelEn: string
  descriptionKo: string
  descriptionEn: string
  languageCodes: string[]
}

export const MARKET_LANGUAGE_PRESETS: MarketLanguagePreset[] = [
  {
    id: 'core',
    labelKo: '기본 출시',
    labelEn: 'Core launch',
    descriptionKo: '국내 사용자를 우선으로 하되 영어권 시청자까지 바로 대응합니다.',
    descriptionEn: 'Start with Korea-first operations while covering English-speaking viewers.',
    languageCodes: ['ko', 'en'],
  },
  {
    id: 'creator-growth',
    labelKo: '크리에이터 추천 언어',
    labelEn: 'Creator language picks',
    descriptionKo: 'YouTube 시청자가 많고 현지화 효과를 기대하기 쉬운 언어를 우선 선택합니다.',
    descriptionEn: 'Prioritize languages with large YouTube audiences and practical localization potential.',
    languageCodes: ['en', 'ja', 'es', 'pt', 'id', 'vi', 'th', 'hi'],
  },
  {
    id: 'global-broad',
    labelKo: '글로벌 확장',
    labelEn: 'Global expansion',
    descriptionKo: '초기 성과가 확인된 뒤 유럽과 중동 주요 언어까지 확장합니다.',
    descriptionEn: 'Expand into major European and Middle Eastern languages after initial traction.',
    languageCodes: ['en', 'ja', 'es', 'pt', 'fr', 'de', 'id', 'vi', 'th', 'hi', 'ar'],
  },
]

export const DEFAULT_METADATA_TARGET_PRESET = 'creator-growth'

export function getMarketLanguagePreset(id: string): MarketLanguagePreset {
  return (
    MARKET_LANGUAGE_PRESETS.find((preset) => preset.id === id) ??
    MARKET_LANGUAGE_PRESETS.find((preset) => preset.id === DEFAULT_METADATA_TARGET_PRESET) ??
    MARKET_LANGUAGE_PRESETS[0]
  )
}
