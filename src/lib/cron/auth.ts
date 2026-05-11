import 'server-only'

import { NextRequest } from 'next/server'
import { apiFail } from '@/lib/api/response'

export function authorizeCron(req: NextRequest, name: string): Response | null {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      return apiFail('CONFIG_ERROR', `CRON_SECRET is required for ${name}`, 503)
    }
    return null
  }

  const authorization = req.headers.get('authorization')
  if (authorization !== `Bearer ${secret}`) {
    return apiFail('UNAUTHORIZED', 'Invalid cron authorization', 401)
  }

  return null
}
