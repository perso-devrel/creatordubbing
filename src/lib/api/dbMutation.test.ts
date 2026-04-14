import { describe, it, expect, vi, beforeEach } from 'vitest'
import { dbMutation } from './dbMutation'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('dbMutation', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('returns data on success', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ ok: true, data: { jobId: 42 } }),
    })
    const result = await dbMutation<{ jobId: number }>({
      type: 'createDubbingJob',
      payload: { userId: 'u1' },
    })
    expect(result).toEqual({ jobId: 42 })
    expect(mockFetch).toHaveBeenCalledWith('/api/dashboard/mutations', expect.objectContaining({
      method: 'POST',
    }))
  })

  it('returns null on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ ok: false, error: { code: 'FORBIDDEN' } }),
    })
    const result = await dbMutation({ type: 'test', payload: {} })
    expect(result).toBeNull()
  })

  it('returns null on fetch error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network'))
    const result = await dbMutation({ type: 'test', payload: {} })
    expect(result).toBeNull()
  })

  it('returns null on invalid JSON response', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => { throw new Error('bad json') },
    })
    const result = await dbMutation({ type: 'test', payload: {} })
    expect(result).toBeNull()
  })
})
