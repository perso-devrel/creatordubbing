import type {
  DeliverableMode,
  UploadSettings,
  VideoMetadata,
  VideoSource,
} from '../types/dubbing.types'

export const PERSO_SINGLE_JOB_MAX_DURATION_MS = 30 * 60 * 1000

type VideoDuration = Pick<VideoMetadata, 'duration' | 'durationMs'>

export function getVideoDurationMs(videoMeta: VideoDuration | null | undefined): number {
  return videoMeta?.durationMs ?? (videoMeta?.duration ?? 0) * 1000
}

export function isOverSinglePersoJobLimit(videoMeta: VideoDuration | null | undefined): boolean {
  return getVideoDurationMs(videoMeta) > PERSO_SINGLE_JOB_MAX_DURATION_MS
}

export function isLongVideoUploadCaptionOutput(args: {
  videoMeta: VideoDuration | null | undefined
  videoSource: Pick<VideoSource, 'type'> | null | undefined
  deliverableMode: DeliverableMode
}): boolean {
  return isOverSinglePersoJobLimit(args.videoMeta) &&
    args.videoSource?.type === 'upload' &&
    args.deliverableMode === 'originalWithMultiAudio'
}

export function isLongVideoSttCaptionMode(args: {
  videoMeta: VideoDuration | null | undefined
  videoSource: Pick<VideoSource, 'type'> | null | undefined
  deliverableMode: DeliverableMode
  uploadSettings: Pick<UploadSettings, 'captionGenerationMode' | 'uploadCaptions'>
}): boolean {
  return isLongVideoUploadCaptionOutput(args) &&
    args.uploadSettings.uploadCaptions &&
    args.uploadSettings.captionGenerationMode === 'stt'
}

export function canUseSelectedOutputForVideo(args: {
  videoMeta: VideoDuration | null | undefined
  videoSource: Pick<VideoSource, 'type'> | null | undefined
  deliverableMode: DeliverableMode
}): boolean {
  if (!isOverSinglePersoJobLimit(args.videoMeta)) return true
  return isLongVideoUploadCaptionOutput(args)
}
