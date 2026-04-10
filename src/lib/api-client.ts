/**
 * Client-side API wrapper for /api/perso/* and /api/youtube/*.
 *
 * These functions run in the BROWSER (or in server components/route
 * handlers, since they're isomorphic fetch calls). They never touch
 * PERSO_API_KEY directly — everything proxies through our Next.js
 * Route Handlers.
 *
 * IMPORTANT: Do NOT add `import 'server-only'` here — that would prevent
 * client components from importing this module.
 */

import type {
  DownloadResponse,
  DownloadTarget,
  ExternalMetadataResponse,
  MediaValidateRequest,
  PersoLanguage,
  PersoSpace,
  ProgressResponse,
  ProjectDetail,
  SasTokenResponse,
  ScriptSentence,
  TranslateRequest,
  TranslateResponse,
  UploadVideoResponse,
} from '@/lib/perso/types'
import type {
  ChannelStats,
  MyVideoItem,
  VideoStats,
  YouTubeUploadResult,
} from '@/lib/youtube/types'

const PERSO = '/api/perso'
const YT = '/api/youtube'

// ─── Internal helpers ──────────────────────────────────────────

interface ApiEnvelope<T> {
  ok: boolean
  data?: T
  error?: { code: string; message: string; details?: unknown }
}

async function json<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => null)) as ApiEnvelope<T> | null
  if (!body) {
    throw new Error(`HTTP ${res.status}: invalid response body`)
  }
  if (!body.ok || body.data === undefined) {
    const msg = body.error?.message || `HTTP ${res.status}`
    const err = new Error(msg) as Error & { code?: string; status?: number }
    err.code = body.error?.code
    err.status = res.status
    throw err
  }
  return body.data
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: 'no-store' })
  return json<T>(res)
}

async function sendJson<T>(
  path: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body?: unknown,
): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  return json<T>(res)
}

// ─── Perso: Spaces & Languages ─────────────────────────────────

export function getSpaces() {
  return getJson<PersoSpace[]>(`${PERSO}/spaces`)
}

export function getLanguages() {
  return getJson<PersoLanguage[]>(`${PERSO}/languages`)
}

// ─── Perso: External (YouTube) ─────────────────────────────────

export function getExternalMetadata(
  spaceSeq: number,
  url: string,
  lang = 'ko',
): Promise<ExternalMetadataResponse> {
  return sendJson(`${PERSO}/external/metadata`, 'POST', {
    spaceSeq,
    url,
    lang,
  })
}

export function uploadExternalVideo(
  spaceSeq: number,
  url: string,
  lang = 'ko',
): Promise<UploadVideoResponse> {
  return sendJson(`${PERSO}/external/upload`, 'PUT', { spaceSeq, url, lang })
}

// ─── Perso: Direct file upload (SAS → Blob → register) ─────────

export function getSasToken(fileName: string): Promise<SasTokenResponse> {
  const qs = new URLSearchParams({ fileName }).toString()
  return getJson<SasTokenResponse>(`${PERSO}/upload/sas-token?${qs}`)
}

/**
 * Upload a File directly to Azure Blob Storage.
 * Runs in the browser (CORS is allowed on Azure).
 */
export async function uploadFileToBlob(
  sasUrl: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<void> {
  // Use XMLHttpRequest for upload progress events
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', sasUrl)
    xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob')
    xhr.setRequestHeader(
      'Content-Type',
      file.type || 'application/octet-stream',
    )
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`Blob upload failed: ${xhr.status}`))
    }
    xhr.onerror = () => reject(new Error('Network error during blob upload'))
    xhr.send(file)
  })
}

export function registerUploadedVideo(
  spaceSeq: number,
  fileUrl: string,
  fileName: string,
): Promise<UploadVideoResponse> {
  return sendJson(`${PERSO}/upload/register`, 'PUT', {
    spaceSeq,
    fileUrl,
    fileName,
  })
}

/**
 * Full client-side upload flow: SAS → Blob PUT → register.
 * Mirror of the Vite project's `uploadVideoFile`.
 */
export async function uploadVideoFile(
  spaceSeq: number,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<UploadVideoResponse> {
  const { blobSasUrl } = await getSasToken(file.name)
  await uploadFileToBlob(blobSasUrl, file, onProgress)
  const fileUrl = blobSasUrl.split('?')[0]
  return registerUploadedVideo(spaceSeq, fileUrl, file.name)
}

// ─── Perso: Media validate ─────────────────────────────────────

export function validateMedia(body: MediaValidateRequest) {
  return sendJson<unknown>(`${PERSO}/validate`, 'POST', body)
}

// ─── Perso: Queue & Translate ──────────────────────────────────

export function initializeQueue(spaceSeq: number) {
  return sendJson<unknown>(
    `${PERSO}/queue?spaceSeq=${spaceSeq}`,
    'PUT',
  )
}

export function submitTranslation(
  spaceSeq: number,
  body: TranslateRequest,
): Promise<TranslateResponse> {
  return sendJson(`${PERSO}/translate?spaceSeq=${spaceSeq}`, 'POST', body)
}

// ─── Perso: Progress / Projects / Script ───────────────────────

export function getProjectProgress(
  projectSeq: number,
  spaceSeq: number,
): Promise<ProgressResponse> {
  return getJson(
    `${PERSO}/progress?projectSeq=${projectSeq}&spaceSeq=${spaceSeq}`,
  )
}

export function listProjects(spaceSeq: number): Promise<ProjectDetail[]> {
  return getJson(`${PERSO}/projects?spaceSeq=${spaceSeq}`)
}

export function getProjectDetail(
  projectSeq: number,
  spaceSeq: number,
): Promise<ProjectDetail> {
  return getJson(
    `${PERSO}/project?projectSeq=${projectSeq}&spaceSeq=${spaceSeq}`,
  )
}

export function getProjectScript(
  projectSeq: number,
  spaceSeq: number,
): Promise<ScriptSentence[]> {
  return getJson(
    `${PERSO}/script?projectSeq=${projectSeq}&spaceSeq=${spaceSeq}`,
  )
}

export function updateSentenceTranslation(
  projectSeq: number,
  sentenceSeq: number,
  translatedText: string,
) {
  return sendJson<unknown>(
    `${PERSO}/script?projectSeq=${projectSeq}&sentenceSeq=${sentenceSeq}`,
    'PATCH',
    { translatedText },
  )
}

export function regenerateSentenceAudio(
  projectSeq: number,
  audioSentenceSeq: number,
) {
  return sendJson<unknown>(
    `${PERSO}/script/regenerate?projectSeq=${projectSeq}&audioSentenceSeq=${audioSentenceSeq}`,
    'PATCH',
  )
}

// ─── Perso: Download & Lip sync ────────────────────────────────

export function getDownloadLinks(
  projectSeq: number,
  spaceSeq: number,
  target: DownloadTarget = 'all',
): Promise<DownloadResponse> {
  return getJson(
    `${PERSO}/download?projectSeq=${projectSeq}&spaceSeq=${spaceSeq}&target=${target}`,
  )
}

export function requestLipSync(projectSeq: number, spaceSeq: number) {
  return sendJson<unknown>(
    `${PERSO}/lipsync?projectSeq=${projectSeq}&spaceSeq=${spaceSeq}`,
    'POST',
  )
}

// ─── Helper: resolve Perso file path to full URL ───────────────

const PERSO_FILE_BASE =
  process.env.NEXT_PUBLIC_PERSO_FILE_BASE_URL || 'https://perso.ai'

export function getPersoFileUrl(path: string): string {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `${PERSO_FILE_BASE}${path.startsWith('/') ? '' : '/'}${path}`
}

// ─── YouTube client wrappers ───────────────────────────────────

function ytHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}` }
}

export async function ytUploadVideo(params: {
  accessToken: string
  video: File | Blob
  title: string
  description: string
  tags: string[]
  categoryId?: string
  privacyStatus?: 'public' | 'unlisted' | 'private'
  language?: string
}): Promise<YouTubeUploadResult> {
  const form = new FormData()
  form.append('video', params.video)
  form.append('title', params.title)
  form.append('description', params.description)
  form.append('tags', params.tags.join(','))
  if (params.categoryId) form.append('categoryId', params.categoryId)
  if (params.privacyStatus) form.append('privacyStatus', params.privacyStatus)
  if (params.language) form.append('language', params.language)

  const res = await fetch(`${YT}/upload`, {
    method: 'POST',
    headers: ytHeaders(params.accessToken),
    body: form,
  })
  return json<YouTubeUploadResult>(res)
}

export async function ytUploadCaption(params: {
  accessToken: string
  videoId: string
  language: string
  name: string
  srtContent: string
}): Promise<{ uploaded: true }> {
  const { accessToken, ...body } = params
  const res = await fetch(`${YT}/caption`, {
    method: 'POST',
    headers: {
      ...ytHeaders(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  return json(res)
}

export async function ytFetchChannelStats(
  accessToken: string,
): Promise<ChannelStats | null> {
  const res = await fetch(`${YT}/stats?channel=true`, {
    headers: ytHeaders(accessToken),
    cache: 'no-store',
  })
  return json(res)
}

export async function ytFetchVideoStats(
  accessToken: string,
  videoIds: string[],
): Promise<VideoStats[]> {
  const qs = new URLSearchParams({ videoIds: videoIds.join(',') }).toString()
  const res = await fetch(`${YT}/stats?${qs}`, {
    headers: ytHeaders(accessToken),
    cache: 'no-store',
  })
  return json(res)
}

export async function ytFetchMyVideos(
  accessToken: string,
  maxResults = 10,
): Promise<MyVideoItem[]> {
  const res = await fetch(`${YT}/videos?maxResults=${maxResults}`, {
    headers: ytHeaders(accessToken),
    cache: 'no-store',
  })
  return json(res)
}
