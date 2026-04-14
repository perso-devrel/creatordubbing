import { describe, it, expect } from 'vitest'
import { SUPPORTED_LANGUAGES, getLanguageByCode } from './languages'

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
