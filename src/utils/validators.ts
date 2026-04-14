const YOUTUBE_URL_REGEX =
  /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/

const DIRECT_VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm']

export function isValidYouTubeUrl(url: string): boolean {
  return YOUTUBE_URL_REGEX.test(url)
}

export function isValidVideoUrl(url: string): boolean {
  if (!url) return false
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) return false
  } catch {
    return false
  }
  if (isValidYouTubeUrl(url)) return true
  const pathname = url.split('?')[0].toLowerCase()
  return DIRECT_VIDEO_EXTENSIONS.some((ext) => pathname.endsWith(`.${ext}`))
}

export function extractVideoId(url: string): string | null {
  const match = url.match(YOUTUBE_URL_REGEX)
  return match ? match[1] : null
}

const ALLOWED_VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm']
const MAX_FILE_SIZE_MB = 2048

export function isValidVideoFile(file: File): { valid: boolean; error?: string } {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!ext || !ALLOWED_VIDEO_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `Unsupported format. Use: ${ALLOWED_VIDEO_EXTENSIONS.join(', ')}` }
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return { valid: false, error: `File too large. Maximum ${MAX_FILE_SIZE_MB}MB.` }
  }
  return { valid: true }
}
