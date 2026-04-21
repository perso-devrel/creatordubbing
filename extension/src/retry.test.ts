import { describe, it, expect, vi } from 'vitest'
import { withRetry, buildManualGuideUrl } from './retry'

describe('withRetry', () => {
  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 0 })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries on failure and succeeds on second attempt', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok')
    const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 0 })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('throws after maxAttempts exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'))
    await expect(
      withRetry(fn, { maxAttempts: 3, baseDelayMs: 0 }),
    ).rejects.toThrow('always fails')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('calls onRetry callback on each retry', async () => {
    const onRetry = vi.fn()
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockRejectedValueOnce(new Error('fail2'))
      .mockResolvedValue('ok')
    await withRetry(fn, { maxAttempts: 3, baseDelayMs: 0, onRetry })
    expect(onRetry).toHaveBeenCalledTimes(2)
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error))
    expect(onRetry).toHaveBeenCalledWith(2, expect.any(Error))
  })

  it('does not call onRetry on first attempt', async () => {
    const onRetry = vi.fn()
    const fn = vi.fn().mockResolvedValue('ok')
    await withRetry(fn, { maxAttempts: 3, baseDelayMs: 0, onRetry })
    expect(onRetry).not.toHaveBeenCalled()
  })

  it('respects maxAttempts=1 (no retry)', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'))
    await expect(
      withRetry(fn, { maxAttempts: 1, baseDelayMs: 0 }),
    ).rejects.toThrow('fail')
    expect(fn).toHaveBeenCalledTimes(1)
  })
})

describe('buildManualGuideUrl', () => {
  it('builds correct YouTube Studio translations URL', () => {
    expect(buildManualGuideUrl('abc123')).toBe(
      'https://studio.youtube.com/video/abc123/translations',
    )
  })
})
