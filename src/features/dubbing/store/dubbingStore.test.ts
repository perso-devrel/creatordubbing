import { beforeEach, describe, expect, it } from 'vitest'
import { useDubbingStore } from './dubbingStore'

describe('dubbingStore YouTube uploads', () => {
  beforeEach(() => {
    useDubbingStore.getState().reset()
  })

  it('keeps uploaded video ids until a new dubbing reset', () => {
    useDubbingStore.getState().setYouTubeUploadState('en', {
      status: 'done',
      progress: 100,
      videoId: 'yt-123',
    })

    expect(useDubbingStore.getState().youtubeUploads.en).toEqual({
      status: 'done',
      progress: 100,
      videoId: 'yt-123',
    })

    useDubbingStore.getState().reset()

    expect(useDubbingStore.getState().youtubeUploads).toEqual({})
  })

  it('skips upload settings after the output step when download-only is selected', () => {
    const store = useDubbingStore.getState()

    store.setStep(3)
    store.setDeliverableMode('downloadOnly')
    store.nextStep()

    expect(useDubbingStore.getState().currentStep).toBe(5)

    useDubbingStore.getState().prevStep()

    expect(useDubbingStore.getState().currentStep).toBe(3)
  })
})
