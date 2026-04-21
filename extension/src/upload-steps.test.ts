import { describe, it, expect, vi } from 'vitest'
import type { DomHelper, UploadContext } from './upload-steps'
import {
  getStepSequence,
  openLanguagesPage,
  clickAddLanguage,
  selectLanguage,
  clickDubAdd,
  injectAudioFile,
  waitForPublishReady,
  publish,
} from './upload-steps'

function createMockDom(): DomHelper {
  const mockEl = {} as Element
  return {
    waitFor: vi.fn().mockResolvedValue(mockEl),
    query: vi.fn().mockReturnValue(mockEl),
    click: vi.fn(),
    typeText: vi.fn(),
    sleep: vi.fn().mockResolvedValue(undefined),
  }
}

function createMockContext(overrides?: Partial<UploadContext>): UploadContext {
  return {
    jobId: 'job_test',
    videoId: 'vid_test',
    languageCode: 'ko',
    audioUrl: 'https://example.com/audio.mp3',
    mode: 'assisted',
    reportProgress: vi.fn(),
    dom: createMockDom(),
    ...overrides,
  }
}

describe('getStepSequence', () => {
  it('returns 6 steps for assisted mode (no publish)', () => {
    expect(getStepSequence('assisted')).toHaveLength(6)
  })

  it('returns 7 steps for auto mode (includes publish)', () => {
    expect(getStepSequence('auto')).toHaveLength(7)
  })
})

describe('openLanguagesPage', () => {
  it('waits for translations page indicator', async () => {
    const ctx = createMockContext()
    await openLanguagesPage(ctx)
    expect(ctx.dom.waitFor).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'translations-page-indicator' }),
      15_000,
    )
    expect(ctx.reportProgress).toHaveBeenCalledWith('OPENING_LANGUAGES', expect.any(String))
  })
})

describe('clickAddLanguage', () => {
  it('finds and clicks the add language button', async () => {
    const ctx = createMockContext()
    await clickAddLanguage(ctx)
    expect(ctx.dom.waitFor).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'add-language-button' }),
    )
    expect(ctx.dom.click).toHaveBeenCalled()
    expect(ctx.reportProgress).toHaveBeenCalledWith('SELECTING_LANGUAGE', expect.any(String))
  })
})

describe('selectLanguage', () => {
  it('searches and selects the target language', async () => {
    const ctx = createMockContext({ languageCode: 'ja' })
    await selectLanguage(ctx)
    expect(ctx.dom.typeText).toHaveBeenCalledWith(expect.anything(), 'ja')
    expect(ctx.dom.click).toHaveBeenCalled()
    expect(ctx.reportProgress).toHaveBeenCalledWith('SELECTING_LANGUAGE', expect.stringContaining('ja'))
  })
})

describe('clickDubAdd', () => {
  it('finds and clicks the audio add button', async () => {
    const ctx = createMockContext()
    await clickDubAdd(ctx)
    expect(ctx.dom.waitFor).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'audio-add-button' }),
    )
    expect(ctx.dom.click).toHaveBeenCalled()
  })
})

describe('injectAudioFile', () => {
  it('waits for file input element', async () => {
    const ctx = createMockContext()
    await injectAudioFile(ctx)
    expect(ctx.dom.waitFor).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'file-input' }),
    )
    expect(ctx.reportProgress).toHaveBeenCalledWith('INJECTING_AUDIO', expect.any(String))
  })
})

describe('waitForPublishReady', () => {
  it('waits for publish button with extended timeout', async () => {
    const ctx = createMockContext()
    await waitForPublishReady(ctx)
    expect(ctx.dom.waitFor).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'publish-button' }),
      30_000,
    )
  })
})

describe('publish', () => {
  it('clicks the publish button', async () => {
    const ctx = createMockContext()
    await publish(ctx)
    expect(ctx.dom.waitFor).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'publish-button' }),
    )
    expect(ctx.dom.click).toHaveBeenCalled()
    expect(ctx.reportProgress).toHaveBeenCalledWith('PUBLISHING', expect.any(String))
  })
})

describe('step sequence execution order', () => {
  it('executes all steps in order for auto mode', async () => {
    const ctx = createMockContext({ mode: 'auto' })
    const steps = getStepSequence('auto')
    const order: string[] = []
    ctx.reportProgress = vi.fn((step: string) => order.push(step))

    for (const step of steps) {
      await step(ctx)
    }

    expect(order).toEqual([
      'OPENING_LANGUAGES',
      'SELECTING_LANGUAGE',
      'SELECTING_LANGUAGE',
      'INJECTING_AUDIO',
      'INJECTING_AUDIO',
      'WAITING_PUBLISH',
      'PUBLISHING',
    ])
  })
})
