import { describe, expect, it } from 'vitest'
import {
  APP_LOCALES,
  DEFAULT_APP_LOCALE,
  DEFAULT_METADATA_TARGET_PRESET,
  getMarketLanguagePreset,
  isAppLocale,
  MARKET_LANGUAGE_PRESETS,
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
})
