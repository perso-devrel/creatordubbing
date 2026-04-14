import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logger } from './logger'

describe('logger', () => {
  const env = process.env as Record<string, string | undefined>
  const originalEnv = env.NODE_ENV

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    env.NODE_ENV = originalEnv
  })

  it('logger.info calls console.log', () => {
    logger.info('test message')
    expect(console.log).toHaveBeenCalledOnce()
  })

  it('logger.warn calls console.log', () => {
    logger.warn('warning message')
    expect(console.log).toHaveBeenCalledOnce()
  })

  it('logger.error calls console.error', () => {
    logger.error('error message')
    expect(console.error).toHaveBeenCalledOnce()
  })

  it('includes extra fields', () => {
    logger.info('msg', { status: 200, path: '/test' })
    const output = (console.log as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(output).toContain('status')
    expect(output).toContain('/test')
  })

  it('outputs JSON in production', () => {
    env.NODE_ENV = 'production'
    logger.info('prod msg', { key: 'val' })
    const output = (console.log as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    const parsed = JSON.parse(output)
    expect(parsed.level).toBe('info')
    expect(parsed.msg).toBe('prod msg')
    expect(parsed.key).toBe('val')
    expect(parsed.ts).toBeDefined()
  })

  it('outputs human-readable in development', () => {
    env.NODE_ENV = 'development'
    logger.error('dev err', { code: 'E01' })
    const output = (console.error as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(output).toContain('ERROR')
    expect(output).toContain('dev err')
    expect(output).toContain('code="E01"')
  })

  it('works without extra fields', () => {
    env.NODE_ENV = 'production'
    logger.info('bare')
    const parsed = JSON.parse((console.log as ReturnType<typeof vi.fn>).mock.calls[0][0] as string)
    expect(parsed.msg).toBe('bare')
    expect(Object.keys(parsed)).toEqual(['level', 'msg', 'ts'])
  })
})
