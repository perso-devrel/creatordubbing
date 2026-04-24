import { NextRequest } from 'next/server'
import { getPendingUploads, updateQueueItemStatus } from '@/lib/db/queries/upload-queue'
import { createYouTubeUpload, updateJobLanguageYouTube } from '@/lib/db/queries'
import { getOrRefreshAccessToken } from '@/lib/auth/token-refresh'
import { uploadVideoToYouTube } from '@/lib/youtube/upload'
import { apiOk, apiFail } from '@/lib/api/response'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  const expected = process.env.CRON_SECRET
  if (expected && secret !== expected) {
    return apiFail('UNAUTHORIZED', 'Invalid cron secret', 401)
  }

  const items = await getPendingUploads(3)
  if (items.length === 0) {
    return apiOk({ processed: 0, message: 'No pending uploads' })
  }

  const results: { id: number; status: string; videoId?: string; error?: string }[] = []

  for (const item of items) {
    await updateQueueItemStatus(item.id, 'processing')

    try {
      const accessToken = await getOrRefreshAccessToken(item.userId)
      if (!accessToken) {
        await updateQueueItemStatus(item.id, 'failed', { error: 'No valid access token — user may need to re-login' })
        results.push({ id: item.id, status: 'failed', error: 'no_token' })
        continue
      }

      // Fetch video from source URL
      const allowed = ['.blob.core.windows.net', '.perso.ai', 'perso.ai']
      const urlHost = new URL(item.videoUrl).hostname
      const isAllowed = allowed.some((d) => urlHost === d || urlHost.endsWith(d))
      if (!isAllowed) {
        await updateQueueItemStatus(item.id, 'failed', { error: 'Video URL domain not allowed' })
        results.push({ id: item.id, status: 'failed', error: 'invalid_domain' })
        continue
      }

      const videoRes = await fetch(item.videoUrl)
      if (!videoRes.ok) {
        await updateQueueItemStatus(item.id, 'failed', { error: `Failed to fetch video: ${videoRes.status}` })
        results.push({ id: item.id, status: 'failed', error: 'fetch_failed' })
        continue
      }
      const videoBlob = await videoRes.blob()

      const result = await uploadVideoToYouTube({
        accessToken,
        videoBlob,
        title: item.title,
        description: item.description,
        tags: item.tags ? item.tags.split(',') : [],
        privacyStatus: item.privacyStatus as 'public' | 'unlisted' | 'private',
        language: item.language || undefined,
      })

      await updateQueueItemStatus(item.id, 'done', { youtubeVideoId: result.videoId })

      // Update DB records
      try {
        await createYouTubeUpload({
          userId: item.userId,
          youtubeVideoId: result.videoId,
          title: item.title,
          languageCode: item.langCode,
          privacyStatus: item.privacyStatus,
          isShort: item.isShort,
        })
        await updateJobLanguageYouTube(item.jobId, item.langCode, result.videoId)
      } catch {
        // DB update is best-effort
      }

      results.push({ id: item.id, status: 'done', videoId: result.videoId })
      logger.info('queue upload success', { queueId: item.id, videoId: result.videoId })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      await updateQueueItemStatus(item.id, 'failed', { error: msg })
      results.push({ id: item.id, status: 'failed', error: msg })
      logger.error('queue upload failed', { queueId: item.id, error: msg })
    }
  }

  return apiOk({ processed: results.length, results })
}
