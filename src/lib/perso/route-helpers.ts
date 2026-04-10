import 'server-only'

import { NextResponse } from 'next/server'
import { mapPersoError } from '@/lib/perso/errors'

/** Success response envelope. */
export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true as const, data }, init)
}

/** Error response envelope with mapped HTTP status. */
export function fail(err: unknown) {
  const { status, code, message, details } = mapPersoError(err)
  return NextResponse.json(
    { ok: false as const, error: { code, message, details } },
    { status },
  )
}

/** Wraps a route handler body, funneling thrown errors through `fail`. */
export async function handle<T>(
  fn: () => Promise<T>,
  init?: ResponseInit,
): Promise<Response> {
  try {
    const data = await fn()
    return ok(data, init)
  } catch (err) {
    return fail(err)
  }
}

/**
 * Read and parse JSON body. Throws a 400 PersoError-like error when the
 * body is malformed or missing required fields.
 */
export async function readJson<T = unknown>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T
  } catch {
    throw Object.assign(new Error('Invalid JSON body'), {
      name: 'PersoError',
      code: 'INVALID_BODY',
      status: 400,
    })
  }
}

/** Require a numeric query param, throw 400 if missing. */
export function requireIntParam(
  url: URL,
  name: string,
): number {
  const raw = url.searchParams.get(name)
  if (raw === null || raw === '') {
    const err = new Error(`Missing required query param: ${name}`)
    ;(err as Error & { code?: string; status?: number }).code = 'MISSING_PARAM'
    ;(err as Error & { code?: string; status?: number }).status = 400
    throw err
  }
  const n = Number(raw)
  if (!Number.isFinite(n)) {
    const err = new Error(`Invalid numeric query param: ${name}`)
    ;(err as Error & { code?: string; status?: number }).code = 'INVALID_PARAM'
    ;(err as Error & { code?: string; status?: number }).status = 400
    throw err
  }
  return n
}

/** Require a string query param, throw 400 if missing. */
export function requireStringParam(url: URL, name: string): string {
  const raw = url.searchParams.get(name)
  if (raw === null || raw === '') {
    const err = new Error(`Missing required query param: ${name}`)
    ;(err as Error & { code?: string; status?: number }).code = 'MISSING_PARAM'
    ;(err as Error & { code?: string; status?: number }).status = 400
    throw err
  }
  return raw
}
