import { NextRequest } from 'next/server'
import { apiOk } from '@/lib/api/response'
import { authorizeCron } from '@/lib/cron/auth'
import { processLongSttCaptionJobs } from '@/lib/long-stt/process'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

async function handle(req: NextRequest) {
  const denied = authorizeCron(req, 'long stt captions cron')
  if (denied) return denied

  const limitParam = req.nextUrl.searchParams.get('limit')
  const limit = Math.min(50, Math.max(1, Number.parseInt(limitParam ?? '20', 10) || 20))
  const result = await processLongSttCaptionJobs({ limit })
  return apiOk(result)
}

export async function GET(req: NextRequest) {
  return handle(req)
}

export async function POST(req: NextRequest) {
  return handle(req)
}
