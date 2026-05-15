import { describe, expect, it } from 'vitest'
import {
  APP_LOCALES,
  CUSTOM_METADATA_TARGET_PRESET,
  DEFAULT_APP_LOCALE,
  DEFAULT_METADATA_TARGET_PRESET,
  getLocaleFromCookieString,
  getMetadataTargetLanguageCodes,
  getMarketLanguagePreset,
  isAppLocale,
  isSafeLocalPath,
  MARKET_LANGUAGE_PRESETS,
  normalizeMetadataTargetLanguages,
  resolveAppLocale,
  withSafeLocalePath,
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

  it('normalizes local paths with a locale prefix', () => {
    expect(withSafeLocalePath('/dashboard', 'en')).toBe('/en/dashboard')
    expect(withSafeLocalePath('/ko/settings?section=youtube#top', 'en')).toBe('/en/settings?section=youtube#top')
    expect(withSafeLocalePath('https://example.com', 'ko', '/dashboard')).toBe('/ko/dashboard')
    expect(withSafeLocalePath('https://example.com', 'ko', 'https://fallback.example.com')).toBe('/ko')
  })

  it('only treats root-relative URLs as safe local paths', () => {
    expect(isSafeLocalPath('/dashboard')).toBe(true)
    expect(isSafeLocalPath('//example.com')).toBe(false)
    expect(isSafeLocalPath('https://example.com')).toBe(false)
    expect(isSafeLocalPath('dashboard')).toBe(false)
  })

  it('reads the app locale cookie from a cookie header string', () => {
    expect(getLocaleFromCookieString('x=1; sub2tube_locale=en; y=2')).toBe('en')
    expect(getLocaleFromCookieString('sub2tube_locale=ja')).toBeNull()
    expect(getLocaleFromCookieString(null)).toBeNull()
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
