import { describe, expect, it } from 'vitest'
import {
  APP_LOCALES,
  CUSTOM_METADATA_TARGET_PRESET,
  DEFAULT_APP_LOCALE,
  DEFAULT_METADATA_TARGET_PRESET,
  getMetadataTargetLanguageCodes,
  getMarketLanguagePreset,
  isAppLocale,
  MARKET_LANGUAGE_PRESETS,
  normalizeMetadataTargetLanguages,
  resolveAppLocale,
} from './config'

describe('i18n config', () => {
  it('uses Korean and English as base app locales', () => {
    expect(APP_LOCALES).toEqual(['ko', 'en'])
    expect(DEFAULT_APP_LOCALE).toBe('ko')
    expect(isAppLocale('ko')).toBe(true)
    expect(isAppLocale('en')).toBe(true)
    expect(isAppLocale('ja')).toBe(false)
  })

  it('resolves unsupported app locales to the default locale', () => {
    expect(resolveAppLocale('en')).toBe('en')
    expect(resolveAppLocale('fr')).toBe('ko')
    expect(resolveAppLocale(null)).toBe('ko')
  })

  it('defines metadata target presets for launch and international growth', () => {
    expect(MARKET_LANGUAGE_PRESETS.map((preset) => preset.id)).toEqual([
      'core',
      'creator-growth',
      'global-broad',
    ])
    expect(getMarketLanguagePreset(DEFAULT_METADATA_TARGET_PRESET).languageCodes).toContain('en')
    expect(getMarketLanguagePreset('missing').id).toBe(DEFAULT_METADATA_TARGET_PRESET)
  })

  it('uses custom metadata target languages when the custom preset is selected', () => {
    expect(getMarketLanguagePreset(CUSTOM_METADATA_TARGET_PRESET).id).toBe(CUSTOM_METADATA_TARGET_PRESET)
    expect(getMetadataTargetLanguageCodes(CUSTOM_METADATA_TARGET_PRESET, ['ja', 'en'])).toEqual(['ja', 'en'])
    expect(getMetadataTargetLanguageCodes('creator-growth', ['ja'])).toEqual(
      getMarketLanguagePreset('creator-growth').languageCodes,
    )
    expect(normalizeMetadataTargetLanguages(['en', 'en', 'ko'])).toEqual(['en', 'ko'])
  })
})
