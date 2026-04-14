import { z } from 'zod'

const YOUTUBE_URL_REGEX =
  /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/

const DIRECT_VIDEO_URL_REGEX =
  /^https?:\/\/.+\.(mp4|mov|webm)(\?.*)?$/i

export const videoUrlSchema = z
  .string()
  .min(1, '영상 URL을 입력하세요')
  .refine(
    (url) => YOUTUBE_URL_REGEX.test(url) || DIRECT_VIDEO_URL_REGEX.test(url),
    'YouTube URL 또는 .mp4/.mov/.webm 직접 링크를 입력하세요',
  )

export const videoUrlInputSchema = z.object({
  url: videoUrlSchema,
  spaceSeq: z.number().int().positive(),
  lang: z.string().min(2).default('ko'),
})
