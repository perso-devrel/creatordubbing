import { describe, it, expect } from 'vitest'
import { apiOk, apiFail, apiFailFromError, apiHandle } from './response'

describe('apiOk', () => {
  it('returns JSON with ok: true envelope', async () => {
    const res = apiOk({ count: 5 })
    const body = await res.json()
    expect(body).toEqual({ ok: true, data: { count: 5 } })
    expect(res.status).toBe(200)
  })

  it('accepts custom ResponseInit', async () => {
    const res = apiOk('created', { status: 201 })
    expect(res.status).toBe(201)
  })
})

describe('apiFail', () => {
  it('returns JSON with ok: false envelope', async () => {
    const res = apiFail('BAD_REQUEST', 'uid required', 400)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body).toEqual({
      ok: false,
      error: { code: 'BAD_REQUEST', message: 'uid required', details: null },
    })
  })

  it('defaults status to 500', async () => {
    const res = apiFail('INTERNAL_ERROR', 'oops')
    expect(res.status).toBe(500)
  })

  it('includes details when provided', async () => {
    const res = apiFail('VALIDATION', 'bad', 422, { fields: ['name'] })
    const body = await res.json()
    expect(body.error.details).toEqual({ fields: ['name'] })
  })
})

describe('apiFailFromError', () => {
  it('extracts code/status from Error with properties', async () => {
    const err = Object.assign(new Error('bad param'), { code: 'MISSING_PARAM', status: 400 })
    const res = apiFailFromError(err)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error.code).toBe('MISSING_PARAM')
    expect(body.error.details).toBeNull()
  })

  it('falls back to 500/INTERNAL_ERROR for plain Error', async () => {
    const res = apiFailFromError(new Error('oops'))
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body.error.code).toBe('INTERNAL_ERROR')
  })

  it('handles non-Error values', async () => {
    const res = apiFailFromError('string error')
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body.error.code).toBe('UNKNOWN')
  })
})

describe('apiHandle', () => {
  it('wraps successful return in ok envelope', async () => {
    const res = await apiHandle(async () => ({ result: 42 }))
    const body = await res.json()
    expect(body).toEqual({ ok: true, data: { result: 42 } })
  })

  it('wraps thrown error in fail envelope', async () => {
    const res = await apiHandle(async () => {
      throw Object.assign(new Error('bad'), { code: 'TEST', status: 418 })
    })
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(res.status).toBe(418)
    expect(body.error.code).toBe('TEST')
  })
})
