import { z } from 'zod'

export const captionBodySchema = z.object({
  videoId: z.string().min(1),
  language: z.string().min(1),
  name: z.string().min(1),
  srtContent: z.string().min(1),
  /** true면 동일 language의 기존 캡션을 모두 삭제한 뒤 새로 삽입한다. */
  replace: z.boolean().optional(),
})

export const analyticsQuerySchema = z.object({
  videoIds: z
    .string()
    .min(1)
    .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

export const statsQuerySchema = z.object({
  channel: z.string().optional(),
  videoIds: z
    .string()
    .default('')
    .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)),
})

export const videosQuerySchema = z.object({
  maxResults: z
    .string()
    .default('10')
    .transform(Number)
    .pipe(z.number().int().min(1).max(50)),
})

export const uploadFormSchema = z.object({
  title: z.string().default(''),
  description: z.string().default(''),
  tags: z
    .string()
    .default('')
    .transform((v) => (v ? v.split(',').map((t) => t.trim()).filter(Boolean) : [])),
  categoryId: z.string().optional(),
  privacyStatus: z.enum(['public', 'unlisted', 'private']).optional(),
  language: z.string().optional(),
})
