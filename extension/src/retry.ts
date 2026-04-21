export interface RetryOptions {
  maxAttempts?: number
  baseDelayMs?: number
  onRetry?: (attempt: number, error: unknown) => void
}

const DEFAULT_MAX_ATTEMPTS = 3
const DEFAULT_BASE_DELAY_MS = 1000

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    baseDelayMs = DEFAULT_BASE_DELAY_MS,
    onRetry,
  } = options

  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err

      if (attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1)
        onRetry?.(attempt, err)
        await sleep(delay)
      }
    }
  }

  throw lastError
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function buildManualGuideUrl(videoId: string): string {
  return `https://studio.youtube.com/video/${videoId}/translations`
}
