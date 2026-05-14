import type { PersoLanguage, PersoTtsModel } from '@/lib/perso/types'

export const DEFAULT_TTS_MODEL: PersoTtsModel = 'ELEVEN_V2'
export const BROADEST_TTS_MODEL: PersoTtsModel = 'ELEVEN_V3'

const PREFERRED_TTS_MODELS: readonly PersoTtsModel[] = [
  DEFAULT_TTS_MODEL,
  BROADEST_TTS_MODEL,
]

function uniqueModels(preferred: PersoTtsModel): PersoTtsModel[] {
  return [preferred, ...PREFERRED_TTS_MODELS.filter((model) => model !== preferred)]
}

function isModelSupported(language: PersoLanguage | undefined, model: PersoTtsModel): boolean {
  if (!language) return false
  if (!Array.isArray(language.supportedTtsModels)) return true
  if (language.supportedTtsModels.length === 0) return false
  return language.supportedTtsModels.includes(model)
}

export function resolveTtsModelForTargetLanguages(
  languages: PersoLanguage[],
  targetLanguageCodes: string[],
  preferred: PersoTtsModel = DEFAULT_TTS_MODEL,
): PersoTtsModel | null {
  const targets = Array.from(new Set(targetLanguageCodes.map((code) => code.trim()).filter(Boolean)))
  if (targets.length === 0) return preferred

  const languagesByCode = new Map(languages.map((language) => [language.code, language]))
  return uniqueModels(preferred).find((model) =>
    targets.every((code) => isModelSupported(languagesByCode.get(code), model)),
  ) ?? null
}
