import { describe, expect, it } from 'vitest'
import {
  PERSO_SINGLE_JOB_MAX_DURATION_MS,
  canUseSelectedOutputForVideo,
  isLongVideoSttCaptionMode,
  isOverSinglePersoJobLimit,
} from './videoDurationLimits'

const shortVideo = {
  duration: 60,
  durationMs: PERSO_SINGLE_JOB_MAX_DURATION_MS,
}

const longVideo = {
  duration: 1801,
  durationMs: PERSO_SINGLE_JOB_MAX_DURATION_MS + 1,
}

describe('videoDurationLimits', () => {
  it('treats exactly 30 minutes as within the Perso single-job limit', () => {
    expect(isOverSinglePersoJobLimit(shortVideo)).toBe(false)
  })

  it('limits videos over 30 minutes to uploaded original-with-captions output', () => {
    expect(canUseSelectedOutputForVideo({
      videoMeta: longVideo,
      videoSource: { type: 'upload' },
      deliverableMode: 'originalWithMultiAudio',
    })).toBe(true)

    expect(canUseSelectedOutputForVideo({
      videoMeta: longVideo,
      videoSource: { type: 'upload' },
      deliverableMode: 'downloadOnly',
    })).toBe(false)

    expect(canUseSelectedOutputForVideo({
      videoMeta: longVideo,
      videoSource: { type: 'channel' },
      deliverableMode: 'originalWithMultiAudio',
    })).toBe(false)
  })

  it('requires STT caption generation for the long-video caption path', () => {
    expect(isLongVideoSttCaptionMode({
      videoMeta: longVideo,
      videoSource: { type: 'upload' },
      deliverableMode: 'originalWithMultiAudio',
      uploadSettings: { uploadCaptions: true, captionGenerationMode: 'stt' },
    })).toBe(true)

    expect(isLongVideoSttCaptionMode({
      videoMeta: longVideo,
      videoSource: { type: 'upload' },
      deliverableMode: 'originalWithMultiAudio',
      uploadSettings: { uploadCaptions: true, captionGenerationMode: 'dubbing' },
    })).toBe(false)
  })
})
