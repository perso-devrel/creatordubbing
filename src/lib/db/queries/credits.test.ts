import { describe, expect, it } from 'vitest'
import { calculateJobCreditMinutes } from './credits'

describe('calculateJobCreditMinutes', () => {
  it('charges full rounded video minutes per completed dubbing language', () => {
    expect(calculateJobCreditMinutes({
      perLanguageMinutes: 20,
      languageCount: 5,
      completedCount: 3,
      isSttCaptionJob: false,
    })).toMatchObject({
      billingMultiplier: 1,
      billableUnits: 5,
      completedBillableUnits: 3,
      billingMode: 'per_language_dubbing',
      estimatedMinutes: 100,
      completedMinutes: 60,
    })
  })

  it('charges STT caption jobs per language at half price', () => {
    expect(calculateJobCreditMinutes({
      perLanguageMinutes: 20,
      languageCount: 5,
      completedCount: 3,
      isSttCaptionJob: true,
    })).toMatchObject({
      billingMultiplier: 0.5,
      billableUnits: 5,
      completedBillableUnits: 3,
      billingMode: 'stt_caption_half_per_language',
      estimatedMinutes: 50,
      completedMinutes: 30,
    })
  })

  it('keeps minimum integer-minute billing for very short STT caption jobs', () => {
    expect(calculateJobCreditMinutes({
      perLanguageMinutes: 1,
      languageCount: 1,
      completedCount: 1,
      isSttCaptionJob: true,
    })).toMatchObject({
      estimatedMinutes: 1,
      completedMinutes: 1,
    })
  })
})
