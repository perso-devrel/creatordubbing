import 'server-only'

import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export interface ApiErrorInfo {
  code: string
  message: string
  details: unknown | null
}

export function apiOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true as const, data }, init)
}

export function apiFail(
  code: string,
  message: string,
  status = 500,
  details: unknown = null,
) {
  return NextResponse.json(
    { ok: false as const, error: { code, message, details } satisfies ApiErrorInfo },
    { status },
  )
}

export function apiFailFromError(err: unknown): Response {
  const { status, code, message, details } = normalizeError(err)
  if (status >= 500) {
    logger.error('api error', { status, code, message, details })
  }
  return apiFail(code, message, status, details)
}

export async function apiHandle<T>(
  fn: () => Promise<T>,
  init?: ResponseInit,
): Promise<Response> {
  try {
    return apiOk(await fn(), init)
  } catch (err) {
    return apiFailFromError(err)
  }
}

interface NormalizedError {
  status: number
  code: string
  message: string
  details: unknown | null
}

function normalizeError(err: unknown): NormalizedError {
  if (err instanceof Error) {
    const e = err as Error & { code?: string; status?: number; details?: unknown }
    return {
      status: typeof e.status === 'number' ? e.status : 500,
      code: typeof e.code === 'string' ? e.code : 'INTERNAL_ERROR',
      message: e.message,
      details: e.details ?? null,
    }
  }
  return { status: 500, code: 'UNKNOWN', message: 'Internal Server Error', details: null }
}
