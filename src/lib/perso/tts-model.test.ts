import { describe, expect, it } from 'vitest'
import { resolveTtsModelForTargetLanguages } from './tts-model'
import type { PersoLanguage } from './types'

const languages: PersoLanguage[] = [
  { code: 'en', name: 'English', experiment: false, supportedTtsModels: ['ELEVEN_V3', 'ELEVEN_V2'] },
  { code: 'ko', name: 'Korean', experiment: true, supportedTtsModels: ['ELEVEN_V3', 'ELEVEN_V2'] },
  { code: 'ja', name: 'Japanese', experiment: false, supportedTtsModels: ['ELEVEN_V3'] },
  { code: 'auto', name: 'Auto', experiment: false, supportedTtsModels: [] },
]

describe('resolveTtsModelForTargetLanguages', () => {
  it('keeps ELEVEN_V2 when every target language supports it', () => {
    expect(resolveTtsModelForTargetLanguages(languages, ['en', 'ko'])).toBe('ELEVEN_V2')
  })

  it('uses ELEVEN_V3 when at least one target language is V3-only', () => {
    expect(resolveTtsModelForTargetLanguages(languages, ['en', 'ko', 'ja'])).toBe('ELEVEN_V3')
  })

  it('returns null when no common model is supported', () => {
    expect(resolveTtsModelForTargetLanguages(languages, ['auto'])).toBeNull()
  })

  it('does not reject older language responses that omit supportedTtsModels', () => {
    expect(resolveTtsModelForTargetLanguages([{ code: 'en', name: 'English', experiment: false }], ['en'])).toBe('ELEVEN_V2')
  })
})
