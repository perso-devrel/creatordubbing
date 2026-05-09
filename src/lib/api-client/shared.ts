interface ApiEnvelope<T> {
  ok: boolean
  data?: T
  error?: { code: string; message: string; details?: unknown }
}

const REQUEST_ERROR_MESSAGE = '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'
const RESPONSE_READ_ERROR_MESSAGE = '요청 결과를 읽지 못했습니다. 잠시 후 다시 시도해 주세요.'

export async function json<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => null)) as ApiEnvelope<T> | null
  if (!body) {
    throw new Error(RESPONSE_READ_ERROR_MESSAGE)
  }
  if (!body.ok || body.data === undefined) {
    const msg = body.error?.message || REQUEST_ERROR_MESSAGE
    const err = new Error(msg) as Error & { code?: string; status?: number }
    err.code = body.error?.code
    err.status = res.status
    throw err
  }
  return body.data
}

export async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: 'no-store' })
  return json<T>(res)
}

export async function sendJson<T>(
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
