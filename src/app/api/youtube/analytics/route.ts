import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { getDb } from '@/lib/db/client'
import {
  fetchVideoAnalytics,
} from '@/lib/youtube/server'
import {
  requireAccessToken,
  parseQuery,
  ytHandle,
} from '@/lib/youtube/route-helpers'
import { analyticsQuerySchema } from '@/lib/validators/youtube'
import type { VideoAnalytics } from '@/lib/youtube/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CACHE_TTL_MS = 24 * 60 * 60 * 1000

let cacheTableEnsured = false

/**
 * Lazy bootstrap analytics_cache table.
 * Idempotent — runs CREATE TABLE IF NOT EXISTS once per process.
 */
async function ensureCacheTable(): Promise<void> {
  if (cacheTableEnsured) return
  const db = getDb()
  await db.execute({
    sql: `CREATE TABLE IF NOT EXISTS analytics_cache (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      video_id TEXT NOT NULL,
      data TEXT NOT NULL,
      fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    args: [],
  })
  cacheTableEnsured = true
}

function defaultDateRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 28)
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

async function getCached(
  userId: string,
  videoId: string,
): Promise<VideoAnalytics | null> {
  await ensureCacheTable()
  const db = getDb()
  const row = await db.execute({
    sql: 'SELECT data, fetched_at FROM analytics_cache WHERE id = ? AND user_id = ?',
    args: [`${userId}:${videoId}`, userId],
  })
  if (!row.rows[0]) return null
  const fetchedAt = new Date(row.rows[0].fetched_at as string).getTime()
  if (Date.now() - fetchedAt > CACHE_TTL_MS) return null
  return JSON.parse(row.rows[0].data as string) as VideoAnalytics
}

async function setCache(
  userId: string,
  videoId: string,
  data: VideoAnalytics,
): Promise<void> {
  await ensureCacheTable()
  const db = getDb()
  await db.execute({
    sql: `INSERT OR REPLACE INTO analytics_cache (id, user_id, video_id, data, fetched_at)
          VALUES (?, ?, ?, ?, datetime('now'))`,
    args: [`${userId}:${videoId}`, userId, videoId, JSON.stringify(data)],
  })
}

/**
 * GET /api/youtube/analytics?videoIds=a,b,c[&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD]
 */
export async function GET(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  return ytHandle(async () => {
    const accessToken = await requireAccessToken(req)
    const url = new URL(req.url)

    const raw = url.searchParams.get('videoIds')
    if (!raw || raw.trim() === '') return []

    const query = parseQuery(url, analyticsQuerySchema)
    const { videoIds } = query
    if (videoIds.length === 0) return []

    const { startDate: defaultStart, endDate: defaultEnd } = defaultDateRange()
    const startDate = query.startDate || defaultStart
    const endDate = query.endDate || defaultEnd

    const userId = auth.session.uid

    // Split into cached and uncached
    const results: VideoAnalytics[] = []
    const uncachedIds: string[] = []
    for (const videoId of videoIds) {
      const cached = await getCached(userId, videoId)
      if (cached) {
        results.push(cached)
      } else {
        uncachedIds.push(videoId)
      }
    }

    // Fetch uncached in parallel (max 5 concurrent)
    if (uncachedIds.length > 0) {
      const CONCURRENCY = 5
      for (let i = 0; i < uncachedIds.length; i += CONCURRENCY) {
        const batch = uncachedIds.slice(i, i + CONCURRENCY)
        const settled = await Promise.allSettled(
          batch.map(async (videoId) => {
            const fresh = await fetchVideoAnalytics(accessToken, videoId, startDate, endDate)
            await setCache(userId, videoId, fresh)
            return fresh
          }),
        )
        for (const r of settled) {
          if (r.status === 'fulfilled') results.push(r.value)
        }
      }
    }

    return results
  })
}
