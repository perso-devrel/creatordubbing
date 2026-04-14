interface ApiEnvelope<T> {
  ok: boolean
  data?: T
  error?: { code: string; message: string; details?: unknown }
}

export async function json<T>(res: Response): Promise<T> {
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
