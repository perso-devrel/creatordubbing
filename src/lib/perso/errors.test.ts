import { describe, it, expect } from 'vitest'
import { PersoError, mapPersoError, ERROR_MAP } from './errors'

describe('PersoError', () => {
  it('creates error with code and status', () => {
    const err = new PersoError('F4004', 'too big', 400)
    expect(err.code).toBe('F4004')
    expect(err.status).toBe(400)
    expect(err.message).toBe('too big')
    expect(err.name).toBe('PersoError')
  })

  it('defaults status to 500', () => {
    const err = new PersoError('UNKNOWN', 'fail')
    expect(err.status).toBe(500)
  })
})

describe('mapPersoError', () => {
  it('maps known PersoError to Korean message', () => {
    const err = new PersoError('F4004', 'original', 400)
    const result = mapPersoError(err)
    expect(result.status).toBe(400)
    expect(result.message).toBe('파일 크기가 한도를 초과했습니다')
    expect(result.code).toBe('F4004')
  })

  it('passes through unknown PersoError code', () => {
    const err = new PersoError('CUSTOM', 'custom msg', 418)
    const result = mapPersoError(err)
    expect(result.status).toBe(418)
    expect(result.message).toBe('custom msg')
  })

  it('wraps generic Error as INTERNAL_ERROR', () => {
    const result = mapPersoError(new Error('boom'))
    expect(result.status).toBe(500)
    expect(result.code).toBe('INTERNAL_ERROR')
    expect(result.message).toBe('boom')
  })

  it('wraps non-Error as UNKNOWN', () => {
    const result = mapPersoError(null)
    expect(result.status).toBe(500)
    expect(result.code).toBe('UNKNOWN')
  })

  it('covers all ERROR_MAP entries', () => {
    for (const [code, { status, message }] of Object.entries(ERROR_MAP)) {
      const err = new PersoError(code, 'test', 500)
      const result = mapPersoError(err)
      expect(result.status).toBe(status)
      expect(result.message).toBe(message)
    }
  })
})
