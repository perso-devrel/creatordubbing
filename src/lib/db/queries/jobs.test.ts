import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockExecute = vi.fn()
const mockBatch = vi.fn()

vi.mock('@/lib/db/client', () => ({
  getDb: vi.fn(() => ({
    execute: mockExecute,
    batch: mockBatch,
  })),
}))

import {
  createDubbingJobWithLanguages,
  updateJobLanguageProjects,
} from './jobs'

const job = {
  userId: 'user1',
  videoTitle: 'video',
  videoDurationMs: 1000,
  videoThumbnail: '',
  sourceLanguage: 'auto',
  mediaSeq: 1,
  spaceSeq: 2,
  lipSyncEnabled: false,
  isShort: false,
}

describe('job queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates all language rows with the explicit dubbing job id', async () => {
    mockExecute
      .mockResolvedValueOnce({
        rows: [
          { name: 'upload_settings_json' },
          { name: 'deliverable_mode' },
          { name: 'original_video_url' },
          { name: 'original_youtube_url' },
        ],
      })
      .mockResolvedValueOnce({ lastInsertRowid: 35 })
    mockBatch.mockResolvedValueOnce([])

    const jobId = await createDubbingJobWithLanguages(job, [
      { code: 'en', projectSeq: 0 },
      { code: 'ja', projectSeq: 0 },
    ])

    expect(jobId).toBe(35)
    expect(mockBatch).toHaveBeenCalledWith([
      expect.objectContaining({ args: [35, 'en', 0] }),
      expect.objectContaining({ args: [35, 'ja', 0] }),
    ])
    const languageSql = mockBatch.mock.calls[0][0].map((q: { sql: string }) => q.sql).join('\n')
    expect(languageSql).not.toContain('last_insert_rowid')
  })

  it('updates existing project rows and inserts missing language rows', async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [{ id: 10 }] })
      .mockResolvedValueOnce({ rowsAffected: 1 })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ lastInsertRowid: 11 })

    await updateJobLanguageProjects(35, [
      { code: 'en', projectSeq: 347162 },
      { code: 'ja', projectSeq: 347163 },
    ])

    expect(mockExecute).toHaveBeenNthCalledWith(2, {
      sql: 'UPDATE job_languages SET project_seq = ? WHERE id = ?',
      args: [347162, 10],
    })
    expect(mockExecute).toHaveBeenNthCalledWith(4, {
      sql: expect.stringContaining('INSERT INTO job_languages'),
      args: [35, 'ja', 347163],
    })
  })
})
