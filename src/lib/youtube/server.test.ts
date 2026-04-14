import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import {
  YouTubeError,
  fetchVideoStatistics,
  fetchChannelStatistics,
  fetchMyVideos,
  fetchVideoAnalytics,
  fetchMultiVideoAnalytics,
  uploadVideoToYouTube,
  uploadCaptionToYouTube,
} from './server'

function jsonResponse(data: unknown, status = 200, headers?: Record<string, string>) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers(headers),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('YouTubeError', () => {
  it('stores status, message, and code', () => {
    const err = new YouTubeError(403, 'Forbidden', 'QUOTA')
    expect(err.status).toBe(403)
    expect(err.message).toBe('Forbidden')
    expect(err.code).toBe('QUOTA')
    expect(err.name).toBe('YouTubeError')
  })

  it('defaults code to YOUTUBE_ERROR', () => {
    const err = new YouTubeError(500, 'fail')
    expect(err.code).toBe('YOUTUBE_ERROR')
  })
})

describe('fetchVideoStatistics', () => {
  it('returns parsed stats for video ids', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        items: [
          { id: 'v1', statistics: { viewCount: '100', likeCount: '10', commentCount: '5' } },
          { id: 'v2', statistics: { viewCount: '200', likeCount: '20', commentCount: '8' } },
        ],
      }),
    )
    const stats = await fetchVideoStatistics('tok', ['v1', 'v2'])
    expect(stats).toHaveLength(2)
    expect(stats[0]).toEqual({ videoId: 'v1', viewCount: 100, likeCount: 10, commentCount: 5 })
    expect(stats[1]).toEqual({ videoId: 'v2', viewCount: 200, likeCount: 20, commentCount: 8 })
  })

  it('returns empty array for empty videoIds', async () => {
    const stats = await fetchVideoStatistics('tok', [])
    expect(stats).toEqual([])
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('throws YouTubeError on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}, 403))
    await expect(fetchVideoStatistics('tok', ['v1'])).rejects.toThrow(YouTubeError)
  })

  it('defaults missing statistics to 0', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ items: [{ id: 'v1' }] }),
    )
    const stats = await fetchVideoStatistics('tok', ['v1'])
    expect(stats[0]).toEqual({ videoId: 'v1', viewCount: 0, likeCount: 0, commentCount: 0 })
  })

  it('handles undefined items in response', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}))
    const stats = await fetchVideoStatistics('tok', ['v1'])
    expect(stats).toEqual([])
  })
})

describe('fetchChannelStatistics', () => {
  it('returns channel stats', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        items: [{
          id: 'ch-1',
          snippet: { title: 'My Channel', thumbnails: { default: { url: 'http://img' } } },
          statistics: { subscriberCount: '1000', viewCount: '5000', videoCount: '50' },
        }],
      }),
    )
    const ch = await fetchChannelStatistics('tok')
    expect(ch).toEqual({
      subscriberCount: 1000,
      viewCount: 5000,
      videoCount: 50,
      channelId: 'ch-1',
      title: 'My Channel',
      thumbnail: 'http://img',
    })
  })

  it('returns null on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}, 401))
    expect(await fetchChannelStatistics('tok')).toBeNull()
  })

  it('returns null when no channel items', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ items: [] }))
    expect(await fetchChannelStatistics('tok')).toBeNull()
  })

  it('defaults missing channel fields to fallback values', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ items: [{ id: 'ch-2' }] }),
    )
    const ch = await fetchChannelStatistics('tok')
    expect(ch).toEqual({
      subscriberCount: 0,
      viewCount: 0,
      videoCount: 0,
      channelId: 'ch-2',
      title: '',
      thumbnail: '',
    })
  })
})

describe('fetchMyVideos', () => {
  it('returns mapped video items', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        items: [{
          id: { videoId: 'v1' },
          snippet: { title: 'T1', publishedAt: '2026-01-01', thumbnails: { medium: { url: 'http://thumb' } } },
        }],
      }),
    )
    const vids = await fetchMyVideos('tok', 5)
    expect(vids).toEqual([{ videoId: 'v1', title: 'T1', thumbnail: 'http://thumb', publishedAt: '2026-01-01' }])
  })

  it('returns empty array on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}, 500))
    expect(await fetchMyVideos('tok')).toEqual([])
  })

  it('handles undefined items in response', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}))
    expect(await fetchMyVideos('tok')).toEqual([])
  })

  it('defaults missing snippet fields to empty strings', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ items: [{ id: { videoId: 'v1' } }] }),
    )
    const vids = await fetchMyVideos('tok')
    expect(vids).toEqual([{ videoId: 'v1', title: '', thumbnail: '', publishedAt: '' }])
  })
})

describe('fetchVideoAnalytics', () => {
  it('fetches daily and country data in parallel', async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse({
          rows: [
            ['2026-01-01', 100, 50, 120],
            ['2026-01-02', 200, 80, 90],
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          rows: [
            ['US', 180, 70],
            ['KR', 120, 60],
          ],
        }),
      )

    const result = await fetchVideoAnalytics('tok', 'vid1', '2026-01-01', '2026-01-02')
    expect(result.videoId).toBe('vid1')
    expect(result.daily).toHaveLength(2)
    expect(result.daily[0]).toEqual({
      date: '2026-01-01',
      views: 100,
      estimatedMinutesWatched: 50,
      averageViewDuration: 120,
    })
    expect(result.countries).toHaveLength(2)
    expect(result.countries[0]).toEqual({ country: 'US', views: 180, estimatedMinutesWatched: 70 })
    expect(result.totals.views).toBe(300)
    expect(result.totals.estimatedMinutesWatched).toBe(130)
    expect(result.totals.averageViewDuration).toBe(105)
  })

  it('handles empty rows gracefully', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ rows: [] }))
      .mockResolvedValueOnce(jsonResponse({}))

    const result = await fetchVideoAnalytics('tok', 'vid1', '2026-01-01', '2026-01-02')
    expect(result.daily).toEqual([])
    expect(result.countries).toEqual([])
    expect(result.totals).toEqual({ views: 0, estimatedMinutesWatched: 0, averageViewDuration: 0 })
  })

  it('handles undefined rows for both daily and country data', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({}))
      .mockResolvedValueOnce(jsonResponse({}))

    const result = await fetchVideoAnalytics('tok', 'vid1', '2026-01-01', '2026-01-02')
    expect(result.daily).toEqual([])
    expect(result.countries).toEqual([])
    expect(result.totals).toEqual({ views: 0, estimatedMinutesWatched: 0, averageViewDuration: 0 })
  })

  it('throws YouTubeError when analytics API fails', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse('Quota exceeded', 403))
    mockFetch.mockResolvedValueOnce(jsonResponse({ rows: [] }))

    await expect(
      fetchVideoAnalytics('tok', 'vid1', '2026-01-01', '2026-01-02'),
    ).rejects.toThrow(YouTubeError)
  })
})

describe('fetchMultiVideoAnalytics', () => {
  it('fetches analytics for multiple videos', async () => {
    for (let i = 0; i < 2; i++) {
      mockFetch
        .mockResolvedValueOnce(jsonResponse({ rows: [['2026-01-01', 10, 5, 60]] }))
        .mockResolvedValueOnce(jsonResponse({ rows: [['US', 10, 5]] }))
    }

    const results = await fetchMultiVideoAnalytics('tok', ['v1', 'v2'], '2026-01-01', '2026-01-01')
    expect(results).toHaveLength(2)
    expect(results[0].videoId).toBe('v1')
    expect(results[1].videoId).toBe('v2')
  })

  it('returns empty array for empty input', async () => {
    const results = await fetchMultiVideoAnalytics('tok', [], '2026-01-01', '2026-01-01')
    expect(results).toEqual([])
  })
})

describe('uploadVideoToYouTube', () => {
  it('performs resumable upload and returns result', async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse({}, 200, { Location: 'https://upload.example.com/resume' }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ id: 'yt-abc', snippet: { title: 'My Vid' }, status: { uploadStatus: 'uploaded' } }),
      )

    const result = await uploadVideoToYouTube({
      accessToken: 'tok',
      videoBlob: new Blob(['video'], { type: 'video/mp4' }),
      title: 'My Vid',
      description: 'Desc',
      tags: ['tag1'],
    })
    expect(result).toEqual({ videoId: 'yt-abc', title: 'My Vid', status: 'uploaded' })
  })

  it('throws on init failure', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse('Bad request', 400))
    await expect(
      uploadVideoToYouTube({
        accessToken: 'tok',
        videoBlob: new Blob(['x']),
        title: 'T',
        description: 'D',
        tags: [],
      }),
    ).rejects.toThrow('YouTube upload init failed')
  })

  it('throws when no Location header returned', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}, 200))
    await expect(
      uploadVideoToYouTube({
        accessToken: 'tok',
        videoBlob: new Blob(['x']),
        title: 'T',
        description: 'D',
        tags: [],
      }),
    ).rejects.toThrow('resumable upload URL')
  })

  it('falls back to input title and default status when response lacks snippet/status', async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse({}, 200, { Location: 'https://upload.example.com/resume' }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ id: 'yt-no-snippet' }),
      )

    const result = await uploadVideoToYouTube({
      accessToken: 'tok',
      videoBlob: new Blob(['video'], { type: 'video/mp4' }),
      title: 'Fallback Title',
      description: 'Desc',
      tags: ['tag1'],
    })
    expect(result).toEqual({ videoId: 'yt-no-snippet', title: 'Fallback Title', status: 'uploaded' })
  })

  it('throws on PUT failure', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({}, 200, { Location: 'https://up.example.com' }))
      .mockResolvedValueOnce(jsonResponse('Server error', 500))
    await expect(
      uploadVideoToYouTube({
        accessToken: 'tok',
        videoBlob: new Blob(['x']),
        title: 'T',
        description: 'D',
        tags: [],
      }),
    ).rejects.toThrow('YouTube upload failed')
  })
})

describe('uploadCaptionToYouTube', () => {
  it('uploads caption successfully', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}))
    await expect(
      uploadCaptionToYouTube({
        accessToken: 'tok',
        videoId: 'v1',
        language: 'ko',
        name: 'Korean',
        srtContent: '1\n00:00:00,000 --> 00:00:01,000\n안녕\n',
      }),
    ).resolves.toBeUndefined()
  })

  it('throws on caption upload failure', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse('Error', 400))
    await expect(
      uploadCaptionToYouTube({
        accessToken: 'tok',
        videoId: 'v1',
        language: 'ko',
        name: 'Korean',
        srtContent: 'x',
      }),
    ).rejects.toThrow('Caption upload failed')
  })
})
