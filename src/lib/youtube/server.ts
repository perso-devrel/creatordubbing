import 'server-only'

export { YouTubeError } from '@/lib/youtube/error'
export {
  uploadVideoToYouTube,
  uploadCaptionToYouTube,
  type YouTubeUploadInput,
  type CaptionUploadInput,
} from '@/lib/youtube/upload'
export {
  fetchVideoStatistics,
  fetchChannelStatistics,
  fetchMyVideos,
} from '@/lib/youtube/stats'
export {
  fetchVideoAnalytics,
  fetchMultiVideoAnalytics,
} from '@/lib/youtube/analytics'
export {
  fetchVideoMetadata,
  updateVideoLocalizations,
} from '@/lib/youtube/metadata'
export type { YouTubeVideoMetadata } from '@/lib/youtube/types'
