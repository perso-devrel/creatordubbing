import 'server-only'

import { apiOk, apiFail, apiFailFromError } from '@/lib/api/response'
import { mapPersoError, PersoError } from '@/lib/perso/errors'
import { logger } from '@/lib/logger'

export { apiOk as ok }

export function fail(err: unknown) {
  if (err instanceof PersoError) {
    const mapped = mapPersoError(err)
    if (mapped.status >= 500) {
      logger.error('perso api error', { status: mapped.status, code: mapped.code, message: mapped.message })
    }
    return apiFail(mapped.code, mapped.message, mapped.status, mapped.details)
  }
  return apiFailFromError(err)
}

export async function handle<T>(
  fn: () => Promise<T>,
  init?: ResponseInit,
): Promise<Response> {
  try {
    return apiOk(await fn(), init)
  } catch (err) {
    return fail(err)
  }
}

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

import type { ZodSchema, ZodError } from 'zod'

export async function parseBody<T>(req: Request, schema: ZodSchema<T>): Promise<T> {
  const raw = await readJson(req)
  const result = schema.safeParse(raw)
  if (!result.success) {
    const zodErr = result.error as ZodError
    const details = zodErr.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw Object.assign(new Error(`Invalid body: ${details}`), {
      name: 'PersoError',
      code: 'INVALID_BODY',
      status: 400,
    })
  }
  return result.data
}

export function requireIntParam(url: URL, name: string): number {
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
