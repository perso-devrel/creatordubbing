import 'server-only'

import { getServerEnv } from '@/lib/env'
import { PersoError } from '@/lib/perso/errors'

/**
 * Base URL strategy:
 * - 'api'  → https://api.perso.ai (PERSO_API_BASE_URL)
 *   Used for /portal/*, /video-translator/*
 * - 'file' → https://perso.ai
 *   Used for /file/* endpoints (metadata, upload, external, SAS, validate)
 */
export type PersoBase = 'api' | 'file'

const FILE_BASE = 'https://perso.ai'

export interface PersoFetchOptions extends Omit<RequestInit, 'body'> {
  baseURL?: PersoBase
  body?: unknown
  /**
   * Per-request timeout (ms). Defaults to 30s.
   * External video upload (`PUT /file/api/upload/video/external`) may take
   * up to 10 minutes — callers should pass 600_000 explicitly for that.
   */
  timeoutMs?: number
  /**
   * Query string params. Values are automatically URL-encoded; undefined
   * values are skipped.
   */
  query?: Record<string, string | number | boolean | undefined | null>
}

/**
 * server-only Perso fetch wrapper.
 *
 * - Injects `XP-API-KEY`
 * - Normalizes `{ result: ... }` envelope → returns inner payload
 * - On non-2xx, throws `PersoError(code, message, status)` so route
 *   handlers can run it through `mapPersoError`
 * - Never caches (Perso data is user-specific)
 */
export async function persoFetch<T = unknown>(
  path: string,
  opts: PersoFetchOptions = {},
): Promise<T> {
  const env = getServerEnv()
  const {
    baseURL = 'api',
    body,
    timeoutMs = 30_000,
    query,
    headers,
    ...rest
  } = opts

  const base = baseURL === 'file' ? FILE_BASE : env.PERSO_API_BASE_URL

  // Build URL with query string
  let url = `${base}${path.startsWith('/') ? path : `/${path}`}`
  if (query) {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') {
        qs.append(k, String(v))
      }
    }
    const qsStr = qs.toString()
    if (qsStr) url += `?${qsStr}`
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  let res: Response
  try {
    res = await fetch(url, {
      ...rest,
      headers: {
        'XP-API-KEY': env.PERSO_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timeout)
    if (err instanceof Error && err.name === 'AbortError') {
      throw new PersoError(
        'TIMEOUT',
        `Perso request timed out after ${timeoutMs}ms`,
        504,
      )
    }
    throw new PersoError(
      'NETWORK_ERROR',
      err instanceof Error ? err.message : 'Network error',
      502,
    )
  } finally {
    clearTimeout(timeout)
  }

  // Try to parse JSON body (may be empty on 204)
  let payload: unknown = null
  const text = await res.text()
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = text
    }
  }

  if (!res.ok) {
    const p = (payload ?? {}) as Record<string, unknown>
    const code = (p.code as string) || (p.errorCode as string) || 'UNKNOWN'
    const message =
      (p.message as string) ||
      (p.error as string) ||
      res.statusText ||
      'Perso API error'
    throw new PersoError(code, message, res.status, payload)
  }

  // Normalize `{ result: ... }` envelope if present
  if (
    payload &&
    typeof payload === 'object' &&
    'result' in (payload as Record<string, unknown>)
  ) {
    return (payload as { result: T }).result
  }
  return payload as T
}

/** Build a full download URL from a Perso relative file path. */
export function resolvePersoFileUrl(path: string): string {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `${FILE_BASE}${path.startsWith('/') ? '' : '/'}${path}`
}
