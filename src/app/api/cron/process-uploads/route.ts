import { NextRequest } from 'next/server'
import { apiFail, apiOk } from '@/lib/api/response'
import { processUploadQueue } from '@/lib/upload-queue/process'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

function authorizeCron(req: NextRequest): Response | null {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      return apiFail('CONFIG_ERROR', 'CRON_SECRET is required for upload cron', 503)
    }
    return null
  }

  const authorization = req.headers.get('authorization')
  if (authorization !== `Bearer ${secret}`) {
    return apiFail('UNAUTHORIZED', 'Invalid cron authorization', 401)
  }

  return null
}

async function handle(req: NextRequest) {
  const denied = authorizeCron(req)
  if (denied) return denied

  const limitParam = req.nextUrl.searchParams.get('limit')
  const limit = Math.min(100, Math.max(1, Number.parseInt(limitParam ?? '50', 10) || 50))
  const result = await processUploadQueue({ limit })
  return apiOk(result)
}

export async function GET(req: NextRequest) {
  return handle(req)
}

export async function POST(req: NextRequest) {
  return handle(req)
}
