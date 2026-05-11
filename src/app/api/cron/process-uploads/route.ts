import { NextRequest } from 'next/server'
import { apiOk } from '@/lib/api/response'
import { processUploadQueue } from '@/lib/upload-queue/process'
import { authorizeCron } from '@/lib/cron/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

async function handle(req: NextRequest) {
  const denied = authorizeCron(req, 'upload cron')
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
