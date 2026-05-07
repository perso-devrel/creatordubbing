import { z } from 'zod'

const trimmedNonEmptyString = z.string().trim().min(1)
export const ttsModelSchema = z.enum(['ELEVEN_V2', 'ELEVEN_V3'])

export const externalMetadataBodySchema = z.object({
  spaceSeq: z.number().int().positive(),
  url: z.string().url(),
  lang: trimmedNonEmptyString.optional(),
})

export const externalUploadBodySchema = z.object({
  spaceSeq: z.number().int().positive(),
  url: z.string().url(),
  lang: trimmedNonEmptyString.optional(),
})

export const uploadRegisterBodySchema = z.object({
  spaceSeq: z.number().int().positive(),
  fileUrl: z.string().url(),
  fileName: z.string().min(1),
})

export const mediaValidateBodySchema = z.object({
  spaceSeq: z.number().int().positive(),
  durationMs: z.number().nonnegative(),
  originalName: trimmedNonEmptyString,
  mediaType: z.enum(['video', 'audio']),
  extension: trimmedNonEmptyString,
  size: z.number().nonnegative().optional(),
  width: z.number().int().min(201).max(7999).optional(),
  height: z.number().int().min(201).max(7999).optional(),
  thumbnailFilePath: z.string().nullable().optional(),
}).superRefine((value, ctx) => {
  if (value.mediaType !== 'video') return
  if (value.width === undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['width'],
      message: 'width is required for video media',
    })
  }
  if (value.height === undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['height'],
      message: 'height is required for video media',
    })
  }
})

export const translateBodySchema = z.object({
  mediaSeq: z.number().int().positive(),
  isVideoProject: z.boolean(),
  sourceLanguageCode: trimmedNonEmptyString,
  targetLanguageCodes: z.array(trimmedNonEmptyString).min(1),
  numberOfSpeakers: z.number().int().positive(),
  withLipSync: z.boolean().optional(),
  preferredSpeedType: z.enum(['GREEN', 'RED']),
  customDictionaryBlobPath: trimmedNonEmptyString.optional(),
  srtBlobPath: trimmedNonEmptyString.optional(),
  ttsModel: ttsModelSchema.optional(),
  title: trimmedNonEmptyString.optional(),
})

export const scriptPatchBodySchema = z.object({
  translatedText: z.string().min(1),
})

export const generateAudioBodySchema = z.object({
  targetText: z.string().min(1),
})

export const downloadTargetSchema = z.enum([
  'video',
  'dubbingVideo',
  'lipSyncVideo',
  'originalSubtitle',
  'translatedSubtitle',
  'originalVoiceAudio',
  'voiceAudio',
  'backgroundAudio',
  'voicewithBackgroundAudio',
  'translatedAudio',
  'all',
  'originalVoiceSpeakers',
  'speakerSegmentExcel',
  'speakerSegmentWithTranslationExcel',
  'audioScript',
])
