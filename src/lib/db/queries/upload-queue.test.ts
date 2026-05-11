import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getDb } from '@/lib/db/client'
import { claimPendingUploads, completeQueueItem, failQueueItem } from './upload-queue'

vi.mock('@/lib/db/client', () => ({
  getDb: vi.fn(),
}))

vi.mock('@/lib/ops/observability', () => ({
  recordOperationalEventSafe: vi.fn(async () => undefined),
}))

const execute = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getDb).mockReturnValue({ execute } as never)
  execute.mockResolvedValue({ rows: [] })
})

describe('upload queue queries', () => {
  it('claims queue items with a single atomic update returning rows', async () => {
    await claimPendingUploads(2, { userId: 'user-1', queueId: 10 })

    const claimCall = execute.mock.calls.at(-1)?.[0]
    expect(claimCall.sql).toContain('UPDATE upload_queue')
    expect(claimCall.sql).toContain("SET status = 'processing'")
    expect(claimCall.sql).toContain('RETURNING *')
    expect(claimCall.sql).toContain('user_id = ?')
    expect(claimCall.sql).toContain('id = ?')
    expect(claimCall.args).toEqual(['user-1', 10, 2])
  })

  it('only completes items currently held in processing status', async () => {
    execute.mockResolvedValueOnce({ rows: [{ id: 10 }] })

    const completed = await completeQueueItem(10, 'yt-123')
    const call = execute.mock.calls.at(-1)?.[0]

    expect(completed).toBe(true)
    expect(call.sql).toContain("WHERE id = ? AND status = 'processing'")
    expect(call.args).toEqual(['yt-123', 10])
  })

  it('only fails items currently held in processing status and increments retries', async () => {
    execute.mockResolvedValueOnce({
      rows: [{ id: 10, user_id: 'user-1', job_id: 5, lang_code: 'ko', retries: 1 }],
    })

    const failed = await failQueueItem(10, 'upload failed')
    const call = execute.mock.calls
      .map((args) => args[0])
      .find((query) => query.sql.includes('UPDATE upload_queue'))

    expect(failed).toBe(true)
    expect(call).toBeDefined()
    expect(call!.sql).toContain('retries = retries + 1')
    expect(call!.sql).toContain("WHERE id = ? AND status = 'processing'")
    expect(call!.args).toEqual(['upload failed', 10])
  })
})
