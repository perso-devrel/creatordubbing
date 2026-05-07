import { describe, it, expect } from 'vitest'
import { SUPPORTED_LANGUAGES, fromBcp47, getLanguageByCode, toBcp47 } from './languages'

describe('SUPPORTED_LANGUAGES', () => {
  it('contains expected languages', () => {
    const codes = SUPPORTED_LANGUAGES.map((l) => l.code)
    expect(codes).toContain('en')
    expect(codes).toContain('ko')
    expect(codes).toContain('ja')
    expect(codes).toContain('es')
  })

  it('each language has required fields', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(lang.code).toBeTruthy()
      expect(lang.name).toBeTruthy()
      expect(lang.nativeName).toBeTruthy()
      expect(lang.flag).toBeTruthy()
    }
  })

  it('has no duplicate codes', () => {
    const codes = SUPPORTED_LANGUAGES.map((l) => l.code)
    expect(new Set(codes).size).toBe(codes.length)
  })
})

describe('getLanguageByCode', () => {
  it('finds existing language', () => {
    const ko = getLanguageByCode('ko')
    expect(ko).toBeDefined()
    expect(ko!.name).toBe('Korean')
    expect(ko!.nativeName).toBe('한국어')
  })

  it('returns undefined for unknown code', () => {
    expect(getLanguageByCode('xx')).toBeUndefined()
  })
})

describe('language code mapping', () => {
  it('maps Perso language codes to YouTube BCP-47 codes', () => {
    expect(toBcp47('pt')).toBe('pt-BR')
    expect(toBcp47('zh')).toBe('zh-Hans')
    expect(toBcp47('ko')).toBe('ko')
  })

  it('maps YouTube BCP-47 codes back to Perso language codes', () => {
    expect(fromBcp47('pt-BR')).toBe('pt')
    expect(fromBcp47('zh-Hans')).toBe('zh')
    expect(fromBcp47('en-US')).toBe('en')
  })
})
