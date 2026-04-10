/**
 * YouTube Data API v3 types — NOT server-only (used by both sides).
 */

export interface YouTubeUploadResult {
  videoId: string
  title: string
  status: string
}

export interface VideoStats {
  videoId: string
  viewCount: number
  likeCount: number
  commentCount: number
}

export interface ChannelStats {
  subscriberCount: number
  viewCount: number
  videoCount: number
  channelId: string
  title: string
  thumbnail: string
}

export interface MyVideoItem {
  videoId: string
  title: string
  thumbnail: string
  publishedAt: string
}
