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

const deductUserMinutesSchema = z.object({
  type: z.literal('deductUserMinutes'),
  payload: z.object({
    userId: z.string().min(1),
    jobId: z.number().int(),
    minutes: z.number().int().positive(),
  }),
})

const CREDIT_PACK_MAX = 120 // must match max value in CREDIT_PACKS

const addCreditsSchema = z.object({
  type: z.literal('addCredits'),
  payload: z.object({
    userId: z.string().min(1),
    minutes: z.number().int().positive().max(CREDIT_PACK_MAX),
  }),
})

const createDubbingJobWithLanguagesSchema = z.object({
  type: z.literal('createDubbingJobWithLanguages'),
  payload: z.object({
    job: createDubbingJobSchema.shape.payload,
    languages: z.array(z.object({ code: z.string().min(1), projectSeq: z.number().int() })).min(1),
  }),
})

const deleteDubbingJobSchema = z.object({
  type: z.literal('deleteDubbingJob'),
  payload: z.object({
    jobId: z.number().int(),
  }),
})

export const mutationActionSchema = z.discriminatedUnion('type', [
  createDubbingJobSchema,
  createJobLanguagesSchema,
  createDubbingJobWithLanguagesSchema,
  updateJobLanguageProgressSchema,
  updateJobLanguageCompletedSchema,
  updateJobStatusSchema,
  createYouTubeUploadSchema,
  updateJobLanguageYouTubeSchema,
  deductUserMinutesSchema,
  addCreditsSchema,
  deleteDubbingJobSchema,
])

export type MutationAction = z.infer<typeof mutationActionSchema>

/**
 * Extract userId from actions that carry it directly.
 * For job-based actions (no userId in payload), the caller must verify ownership
 * by querying the DB — see mutations/route.ts verifyJobOwnership().
 */
export function getUserIdFromAction(action: MutationAction): string | null {
  switch (action.type) {
    case 'createDubbingJob':
      return action.payload.userId
    case 'createDubbingJobWithLanguages':
      return action.payload.job.userId
    case 'createYouTubeUpload':
      return action.payload.userId
    case 'deductUserMinutes':
      return action.payload.userId
    case 'addCredits':
      return action.payload.userId
    default:
      return null
  }
}

/** Actions that operate on a jobId and need ownership verification. */
export function getJobIdFromAction(action: MutationAction): number | null {
  switch (action.type) {
    case 'createJobLanguages':
      return action.payload.jobId
    case 'updateJobLanguageProgress':
      return action.payload.jobId
    case 'updateJobLanguageCompleted':
      return action.payload.jobId
    case 'updateJobStatus':
      return action.payload.jobId
    case 'updateJobLanguageYouTube':
      return action.payload.jobId
    case 'deleteDubbingJob':
      return action.payload.jobId
    case 'deductUserMinutes':
      return action.payload.jobId
    default:
      return null
  }
}
