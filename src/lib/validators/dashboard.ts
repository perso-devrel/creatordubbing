import { z } from 'zod'

export const summaryQuerySchema = z.object({
  uid: z.string().min(1),
})

export const jobsQuerySchema = z.object({
  uid: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
})

export const creditUsageQuerySchema = z.object({
  uid: z.string().min(1),
})

export const languagePerformanceQuerySchema = z.object({
  uid: z.string().min(1),
})

const createDubbingJobSchema = z.object({
  type: z.literal('createDubbingJob'),
  payload: z.object({
    userId: z.string().min(1),
    videoTitle: z.string().min(1),
    videoDurationMs: z.number().int().nonnegative(),
    videoThumbnail: z.string(),
    sourceLanguage: z.string().min(1),
    mediaSeq: z.number().int(),
    spaceSeq: z.number().int(),
    lipSyncEnabled: z.boolean(),
    isShort: z.boolean(),
  }),
})

const createJobLanguagesSchema = z.object({
  type: z.literal('createJobLanguages'),
  payload: z.object({
    jobId: z.number().int(),
    languages: z.array(z.object({ code: z.string().min(1), projectSeq: z.number().int() })).min(1),
  }),
})

const updateJobLanguageProgressSchema = z.object({
  type: z.literal('updateJobLanguageProgress'),
  payload: z.object({
    jobId: z.number().int(),
    langCode: z.string().min(1),
    status: z.string().min(1),
    progress: z.number().min(0).max(100),
    progressReason: z.string(),
  }),
})

const updateJobLanguageCompletedSchema = z.object({
  type: z.literal('updateJobLanguageCompleted'),
  payload: z.object({
    jobId: z.number().int(),
    langCode: z.string().min(1),
    urls: z.object({
      dubbedVideoUrl: z.string().optional(),
      audioUrl: z.string().optional(),
      srtUrl: z.string().optional(),
    }),
  }),
})

const updateJobStatusSchema = z.object({
  type: z.literal('updateJobStatus'),
  payload: z.object({
    jobId: z.number().int(),
    status: z.string().min(1),
  }),
})

const createYouTubeUploadSchema = z.object({
  type: z.literal('createYouTubeUpload'),
  payload: z.object({
    userId: z.string().min(1),
    jobLanguageId: z.number().int().optional(),
    youtubeVideoId: z.string().min(1),
    title: z.string().min(1),
    languageCode: z.string().min(1),
    privacyStatus: z.string().min(1),
    isShort: z.boolean(),
  }),
})

const updateJobLanguageYouTubeSchema = z.object({
  type: z.literal('updateJobLanguageYouTube'),
  payload: z.object({
    jobId: z.number().int(),
    langCode: z.string().min(1),
    youtubeVideoId: z.string().min(1),
  }),
})

export const mutationActionSchema = z.discriminatedUnion('type', [
  createDubbingJobSchema,
  createJobLanguagesSchema,
  updateJobLanguageProgressSchema,
  updateJobLanguageCompletedSchema,
  updateJobStatusSchema,
  createYouTubeUploadSchema,
  updateJobLanguageYouTubeSchema,
])

export type MutationAction = z.infer<typeof mutationActionSchema>

export function getUserIdFromAction(action: MutationAction): string | null {
  switch (action.type) {
    case 'createDubbingJob':
      return action.payload.userId
    case 'createYouTubeUpload':
      return action.payload.userId
    default:
      return null
  }
}
