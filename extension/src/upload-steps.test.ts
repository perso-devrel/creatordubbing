import { describe, it, expect, vi } from 'vitest'
import type { UploadContext } from './upload-steps'
import { getStepSequence, openLanguagesPage, clickAddLanguage, selectLanguage } from './upload-steps'

function createMockContext(overrides?: Partial<UploadContext>): UploadContext {
  return {
    jobId: 'job_test',
    videoId: 'vid_test',
    languageCode: 'ko',
    audioUrl: 'https://example.com/audio.mp3',
    mode: 'assisted',
    reportProgress: vi.fn(),
    ...overrides,
  }
}

describe('getStepSequence', () => {
  it('returns 6 steps for assisted mode (no publish)', () => {
    const steps = getStepSequence('assisted')
    expect(steps).toHaveLength(6)
  })

  it('returns 7 steps for auto mode (includes publish)', () => {
    const steps = getStepSequence('auto')
    expect(steps).toHaveLength(7)
  })
})

describe('step functions report progress', () => {
  it('openLanguagesPage reports OPENING_LANGUAGES', async () => {
    const ctx = createMockContext()
    await openLanguagesPage(ctx)
    expect(ctx.reportProgress).toHaveBeenCalledWith('OPENING_LANGUAGES', expect.any(String))
  })

  it('clickAddLanguage reports SELECTING_LANGUAGE', async () => {
    const ctx = createMockContext()
    await clickAddLanguage(ctx)
    expect(ctx.reportProgress).toHaveBeenCalledWith('SELECTING_LANGUAGE', expect.any(String))
  })

  it('selectLanguage includes language code in detail', async () => {
    const ctx = createMockContext({ languageCode: 'ja' })
    await selectLanguage(ctx)
    expect(ctx.reportProgress).toHaveBeenCalledWith(
      'SELECTING_LANGUAGE',
      expect.stringContaining('ja'),
    )
  })
})
