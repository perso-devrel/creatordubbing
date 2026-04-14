import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { ok, fail, handle, readJson, parseBody, requireIntParam, requireStringParam } from './route-helpers'
import { PersoError } from './errors'

describe('ok', () => {
  it('returns JSON with ok: true envelope', async () => {
    const res = ok({ count: 5 })
    const body = await res.json()
    expect(body).toEqual({ ok: true, data: { count: 5 } })
    expect(res.status).toBe(200)
  })
})

describe('fail', () => {
  it('maps known PersoError code', async () => {
    const err = new PersoError('F4004', 'file too big', 400)
    const res = fail(err)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.ok).toBe(false)
    expect(body.error.code).toBe('F4004')
    expect(body.error.details).toBeNull()
  })

  it('handles unknown PersoError code', async () => {
    const err = new PersoError('XUNKNOWN', 'something', 422)
    const res = fail(err)
    const body = await res.json()
    expect(res.status).toBe(422)
    expect(body.error.code).toBe('XUNKNOWN')
  })

  it('preserves PersoError details', async () => {
    const err = new PersoError('F4004', 'file too big', 400, { maxSize: 100 })
    const res = fail(err)
    const body = await res.json()
    expect(body.error.details).toEqual({ maxSize: 100 })
  })

  it('logs and returns 500 for server PersoError', async () => {
    const err = new PersoError('INTERNAL', 'server broke', 500)
    const res = fail(err)
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body.error.code).toBe('INTERNAL')
  })

  it('handles generic Error', async () => {
    const res = fail(new Error('oops'))
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body.error.code).toBe('INTERNAL_ERROR')
    expect(body.error.details).toBeNull()
  })

  it('handles non-Error', async () => {
    const res = fail('string error')
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body.error.code).toBe('UNKNOWN')
  })
})

describe('handle', () => {
  it('wraps successful return in ok envelope', async () => {
    const res = await handle(async () => ({ result: 42 }))
    const body = await res.json()
    expect(body).toEqual({ ok: true, data: { result: 42 } })
  })

  it('wraps thrown error in fail envelope', async () => {
    const res = await handle(async () => {
      throw new PersoError('F4008', 'too long', 400)
    })
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(res.status).toBe(400)
  })
})

describe('readJson', () => {
  it('parses valid JSON body', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ key: 'value' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const result = await readJson<{ key: string }>(req)
    expect(result).toEqual({ key: 'value' })
  })

  it('throws PersoError-like on invalid JSON', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: 'not json',
    })
    await expect(readJson(req)).rejects.toThrow('Invalid JSON body')
  })
})

describe('parseBody', () => {
  const schema = z.object({ name: z.string().min(1), age: z.number().int().positive() })

  it('parses valid body and returns typed data', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ name: 'Alice', age: 30 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const result = await parseBody(req, schema)
    expect(result).toEqual({ name: 'Alice', age: 30 })
  })

  it('throws with INVALID_BODY on schema mismatch', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ name: '', age: -1 }),
      headers: { 'Content-Type': 'application/json' },
    })
    try {
      await parseBody(req, schema)
      expect.unreachable('should have thrown')
    } catch (err) {
      expect((err as Error & { code: string }).code).toBe('INVALID_BODY')
      expect((err as Error & { status: number }).status).toBe(400)
      expect((err as Error).message).toContain('name')
    }
  })

  it('throws on invalid JSON before schema check', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: 'not json',
    })
    await expect(parseBody(req, schema)).rejects.toThrow('Invalid JSON body')
  })

  it('strips extra fields', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ name: 'Bob', age: 25, extra: true }),
      headers: { 'Content-Type': 'application/json' },
    })
    const result = await parseBody(req, schema)
    expect(result).toEqual({ name: 'Bob', age: 25 })
  })
})

describe('requireIntParam', () => {
  it('returns numeric value', () => {
    const url = new URL('http://localhost?id=42')
    expect(requireIntParam(url, 'id')).toBe(42)
  })

  it('throws on missing param', () => {
    const url = new URL('http://localhost')
    expect(() => requireIntParam(url, 'id')).toThrow('Missing required query param: id')
  })

  it('throws on non-numeric param', () => {
    const url = new URL('http://localhost?id=abc')
    expect(() => requireIntParam(url, 'id')).toThrow('Invalid numeric query param: id')
  })
})

describe('requireStringParam', () => {
  it('returns string value', () => {
    const url = new URL('http://localhost?name=test')
    expect(requireStringParam(url, 'name')).toBe('test')
  })

  it('throws on missing param', () => {
    const url = new URL('http://localhost')
    expect(() => requireStringParam(url, 'name')).toThrow('Missing required query param: name')
  })

  it('throws on empty param', () => {
    const url = new URL('http://localhost?name=')
    expect(() => requireStringParam(url, 'name')).toThrow('Missing required query param: name')
  })
})
