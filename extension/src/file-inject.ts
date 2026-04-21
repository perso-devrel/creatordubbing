export async function fetchAsFile(url: string, filename?: string): Promise<File> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`오디오 파일 다운로드 실패: ${response.status} ${response.statusText}`)
  }

  const blob = await response.blob()
  const contentType = blob.type || 'audio/mpeg'
  const name = filename ?? deriveFilename(url, contentType)

  return new File([blob], name, { type: contentType })
}

export function deriveFilename(url: string, contentType: string): string {
  try {
    const pathname = new URL(url).pathname
    const basename = pathname.split('/').pop()
    if (basename && basename.includes('.')) return basename
  } catch {
    // invalid URL — use fallback
  }

  const ext = MIME_TO_EXT[contentType] ?? 'mp3'
  return `audio_${Date.now()}.${ext}`
}

const MIME_TO_EXT: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/flac': 'flac',
  'audio/aac': 'aac',
  'audio/ogg': 'ogg',
  'audio/webm': 'webm',
}

export function injectFileToInput(input: HTMLInputElement, file: File): void {
  const dataTransfer = new DataTransfer()
  dataTransfer.items.add(file)
  input.files = dataTransfer.files

  input.dispatchEvent(new Event('change', { bubbles: true }))
  input.dispatchEvent(new Event('input', { bubbles: true }))
}
