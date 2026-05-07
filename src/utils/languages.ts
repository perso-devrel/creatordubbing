export type LanguageRegion = 'popular' | 'asia' | 'europe' | 'middle-east'

export interface Language {
  code: string // Perso API language code
  name: string
  nativeName: string
  flag: string
  region: LanguageRegion
}

export const REGION_LABELS: Record<LanguageRegion, string> = {
  popular: '인기',
  asia: '아시아',
  europe: '유럽',
  'middle-east': '중동',
}

// Perso.ai supported target languages (sourced from /video-translator/api/v1/languages).
// Codes are mostly ISO 639-1 with a few exceptions (e.g. `fil` for Filipino).
export const SUPPORTED_LANGUAGES: Language[] = [
  // Popular — 사용 빈도 높은 메이저 언어
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', region: 'popular' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', region: 'popular' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', region: 'popular' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', region: 'popular' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', region: 'popular' },
  { code: 'pt', name: 'Portuguese (Brazil)', nativeName: 'Português', flag: '🇧🇷', region: 'popular' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', region: 'popular' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', region: 'popular' },
  // Asia
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', region: 'asia' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', region: 'asia' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳', region: 'asia' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭', region: 'asia' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾', region: 'asia' },
  { code: 'fil', name: 'Filipino', nativeName: 'Filipino', flag: '🇵🇭', region: 'asia' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳', region: 'asia' },
  { code: 'kk', name: 'Kazakh', nativeName: 'Қазақ тілі', flag: '🇰🇿', region: 'asia' },
  // Europe
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', region: 'europe' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱', region: 'europe' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', region: 'europe' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦', region: 'europe' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱', region: 'europe' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', flag: '🇨🇿', region: 'europe' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', flag: '🇸🇰', region: 'europe' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', flag: '🇭🇺', region: 'europe' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', flag: '🇷🇴', region: 'europe' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български', flag: '🇧🇬', region: 'europe' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', flag: '🇭🇷', region: 'europe' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷', region: 'europe' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪', region: 'europe' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴', region: 'europe' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰', region: 'europe' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮', region: 'europe' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', region: 'europe' },
  // Middle East
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', region: 'middle-east' },
]

/** 마케팅 카피와 메타데이터 등에서 참조하는 단일 출처. SUPPORTED_LANGUAGES 변경 시 자동 동기. */
export const SUPPORTED_LANGUAGE_COUNT = SUPPORTED_LANGUAGES.length

export function getLanguageByCode(code: string): Language | undefined {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)
}

const BCP47_MAP: Record<string, string> = {
  zh: 'zh-Hans',
  pt: 'pt-BR',
}

export function toBcp47(persoCode: string): string {
  return BCP47_MAP[persoCode] || persoCode
}

export function fromBcp47(languageCode: string): string {
  const lower = languageCode.toLowerCase()
  const mapped = Object.entries(BCP47_MAP).find(
    ([, bcp47]) => bcp47.toLowerCase() === lower,
  )
  if (mapped) return mapped[0]
  return lower.split('-')[0]
}
