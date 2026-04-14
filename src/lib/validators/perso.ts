import { z } from 'zod'

export const externalMetadataBodySchema = z.object({
  spaceSeq: z.number().int().positive(),
  url: z.string().url(),
  lang: z.string().min(1).optional(),
})

export const externalUploadBodySchema = z.object({
  spaceSeq: z.number().int().positive(),
  url: z.string().url(),
  lang: z.string().min(1).optional(),
})

export const uploadRegisterBodySchema = z.object({
  spaceSeq: z.number().int().positive(),
  fileUrl: z.string().url(),
  fileName: z.string().min(1),
})

export const mediaValidateBodySchema = z.object({
  spaceSeq: z.number().int().positive(),
  durationMs: z.number().nonnegative(),
  originalName: z.string().min(1),
  mediaType: z.string().min(1),
  extension: z.string().min(1),
  size: z.number().nonnegative(),
  width: z.number().nonnegative(),
  height: z.number().nonnegative(),
})

export const translateBodySchema = z.object({
  mediaSeq: z.number().int().positive(),
  isVideoProject: z.boolean(),
  sourceLanguageCode: z.string().min(1),
  targetLanguageCodes: z.array(z.string().min(1)).min(1),
  numberOfSpeakers: z.number().int().positive(),
  withLipSync: z.boolean().optional(),
  preferredSpeedType: z.enum(['GREEN', 'RED']),
  customDictionaryBlobPath: z.string().optional(),
  srtBlobPath: z.string().optional(),
})

export const scriptPatchBodySchema = z.object({
  translatedText: z.string().min(1),
})

export const downloadTargetSchema = z.enum([
  'video',
  'dubbingVideo',
  'lipSyncVideo',
  'originalSubtitle',
  'translatedSubtitle',
  'voiceAudio',
  'backgroundAudio',
  'all',
])
