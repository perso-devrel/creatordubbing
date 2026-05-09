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
    throw new PersoError('INVALID_BODY', '입력값을 확인해 주세요.', 400)
  }
}

import type { ZodSchema, ZodError } from 'zod'

export async function parseBody<T>(req: Request, schema: ZodSchema<T>): Promise<T> {
  const raw = await readJson(req)
  const result = schema.safeParse(raw)
  if (!result.success) {
    const zodErr = result.error as ZodError
    throw new PersoError('INVALID_BODY', '입력값을 확인해 주세요.', 400, {
      issues: zodErr.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    })
  }
  return result.data
}

function paramError(message: string, code: string): never {
  throw new PersoError(code, message, 400)
}

export function requireIntParam(url: URL, name: string): number {
  const raw = url.searchParams.get(name)
  if (raw === null || raw === '') {
    paramError('필수 입력값이 누락되었습니다.', 'MISSING_PARAM')
  }
  const n = Number(raw)
  if (!Number.isFinite(n)) {
    paramError('입력값 형식을 확인해 주세요.', 'INVALID_PARAM')
  }
  return n
}

export function requireStringParam(url: URL, name: string): string {
  const raw = url.searchParams.get(name)
  if (raw === null || raw === '') {
    paramError('필수 입력값이 누락되었습니다.', 'MISSING_PARAM')
  }
  return raw
}
