import 'server-only'

import type { YouTubeUploadResult } from '@/lib/youtube/types'
import { YouTubeError } from '@/lib/youtube/error'

const YOUTUBE_UPLOAD_BASE = 'https://www.googleapis.com/upload/youtube/v3'

export interface YouTubeLocalization {
  title: string
  description: string
}

export interface YouTubeUploadInput {
  accessToken: string
  videoBlob: Blob
  title: string
  description: string
  tags: string[]
  categoryId?: string
  privacyStatus?: 'public' | 'unlisted' | 'private'
  language?: string
  /**
   * BCP-47 언어 코드를 키로 한 추가 번역 맵.
   * snippet.defaultLanguage가 함께 설정돼야 YouTube가 적용한다.
   */
  localizations?: Record<string, YouTubeLocalization>
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
    localizations,
  } = input

  const hasLocalizations = !!localizations && Object.keys(localizations).length > 0
  const metadata: Record<string, unknown> = {
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
  if (hasLocalizations) {
    metadata.localizations = localizations
  }
  // localizations가 있으면 part에 포함되도록 아래 URL에서 동적으로 합친다.
  const parts = ['snippet', 'status', ...(hasLocalizations ? ['localizations'] : [])].join(',')

  const initRes = await fetch(
    `${YOUTUBE_UPLOAD_BASE}/videos?uploadType=resumable&part=${parts}`,
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
  /** true면 동일 language의 기존 캡션을 모두 삭제한 뒤 새 SRT를 삽입한다. */
  replace?: boolean
}

const YOUTUBE_DATA_BASE = 'https://www.googleapis.com/youtube/v3'

interface CaptionListItem {
  id: string
  snippet?: { language?: string; name?: string }
}

async function listCaptionsForVideo(
  accessToken: string,
  videoId: string,
): Promise<CaptionListItem[]> {
  const res = await fetch(
    `${YOUTUBE_DATA_BASE}/captions?videoId=${encodeURIComponent(videoId)}&part=snippet`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!res.ok) {
    const err = await res.text()
    throw new YouTubeError(
      res.status,
      `Caption list failed: ${err}`,
      'CAPTION_LIST_FAILED',
    )
  }
  const data = (await res.json()) as { items?: CaptionListItem[] }
  return data.items ?? []
}

async function deleteCaption(
  accessToken: string,
  captionId: string,
): Promise<void> {
  const res = await fetch(
    `${YOUTUBE_DATA_BASE}/captions?id=${encodeURIComponent(captionId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  )
  if (!res.ok && res.status !== 404) {
    const err = await res.text()
    throw new YouTubeError(
      res.status,
      `Caption delete failed: ${err}`,
      'CAPTION_DELETE_FAILED',
    )
  }
}

export async function uploadCaptionToYouTube(
  input: CaptionUploadInput,
): Promise<void> {
  const { accessToken, videoId, language, name, srtContent, replace } = input

  if (replace) {
    const existing = await listCaptionsForVideo(accessToken, videoId)
    const sameLang = existing.filter(
      (c) => (c.snippet?.language || '').toLowerCase() === language.toLowerCase(),
    )
    for (const c of sameLang) {
      await deleteCaption(accessToken, c.id)
    }
  }

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
