import 'server-only'

import type { YouTubeUploadResult } from '@/lib/youtube/types'
import { YouTubeError } from '@/lib/youtube/error'

const YOUTUBE_UPLOAD_BASE = 'https://www.googleapis.com/upload/youtube/v3'

export interface YouTubeUploadInput {
  accessToken: string
  videoBlob: Blob
  title: string
  description: string
  tags: string[]
  categoryId?: string
  privacyStatus?: 'public' | 'unlisted' | 'private'
  language?: string
}

export async function uploadVideoToYouTube(
  input: YouTubeUploadInput,
): Promise<YouTubeUploadResult> {
  const {
    accessToken,
    videoBlob,
    title,
    description,
    tags,
    categoryId = '22',
    privacyStatus = 'private',
    language = 'en',
  } = input

  const metadata = {
    snippet: {
      title,
      description,
      tags,
      categoryId,
      defaultLanguage: language,
      defaultAudioLanguage: language,
    },
    status: {
      privacyStatus,
      selfDeclaredMadeForKids: false,
    },
  }

  const initRes = await fetch(
    `${YOUTUBE_UPLOAD_BASE}/videos?uploadType=resumable&part=snippet,status`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Length': String(videoBlob.size),
        'X-Upload-Content-Type': videoBlob.type || 'video/mp4',
      },
      body: JSON.stringify(metadata),
    },
  )

  if (!initRes.ok) {
    const err = await initRes.text()
    throw new YouTubeError(
      initRes.status,
      `YouTube upload init failed: ${err}`,
      'UPLOAD_INIT_FAILED',
    )
  }

  const uploadUrl = initRes.headers.get('Location')
  if (!uploadUrl) {
    throw new YouTubeError(
      500,
      'YouTube did not return a resumable upload URL',
      'NO_UPLOAD_URL',
    )
  }

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': videoBlob.type || 'video/mp4',
    },
    body: videoBlob,
  })

  if (!putRes.ok) {
    const err = await putRes.text()
    throw new YouTubeError(
      putRes.status,
      `YouTube upload failed: ${err}`,
      'UPLOAD_FAILED',
    )
  }

  const result = (await putRes.json()) as {
    id: string
    snippet?: { title?: string }
    status?: { uploadStatus?: string }
  }

  return {
    videoId: result.id,
    title: result.snippet?.title || title,
    status: result.status?.uploadStatus || 'uploaded',
  }
}

export interface CaptionUploadInput {
  accessToken: string
  videoId: string
  language: string
  name: string
  srtContent: string
}

export async function uploadCaptionToYouTube(
  input: CaptionUploadInput,
): Promise<void> {
  const { accessToken, videoId, language, name, srtContent } = input

  const metadata = { snippet: { videoId, language, name } }
  const boundary = `caption_boundary_${Date.now()}`
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(metadata) +
    `\r\n--${boundary}\r\n` +
    `Content-Type: application/x-subrip\r\n\r\n` +
    srtContent +
    `\r\n--${boundary}--`

  const res = await fetch(
    `${YOUTUBE_UPLOAD_BASE}/captions?uploadType=multipart&part=snippet`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  )

  if (!res.ok) {
    const err = await res.text()
    throw new YouTubeError(
      res.status,
      `Caption upload failed: ${err}`,
      'CAPTION_UPLOAD_FAILED',
    )
  }
}
