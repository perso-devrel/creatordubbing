import { fromBcp47, getLanguageByCode } from '@/utils/languages'

export function resolveCaptionTrackName(languageCode: string, explicitName?: string | null): string {
  const trimmedName = explicitName?.trim()
  if (trimmedName) return trimmedName

  const normalizedCode = languageCode.trim()
  if (normalizedCode) {
    const lang = getLanguageByCode(fromBcp47(normalizedCode))
    return lang?.name || normalizedCode
  }

  return 'Caption'
}
