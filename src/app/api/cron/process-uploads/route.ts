import { NextRequest } from 'next/server'
import { apiOk } from '@/lib/api/response'
import { requireSession } from '@/lib/auth/session'
import { processUploadQueue } from '@/lib/upload-queue/process'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response

  const result = await processUploadQueue()
  return apiOk(result)
}
