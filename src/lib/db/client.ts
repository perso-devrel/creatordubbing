import 'server-only'

import { createClient, type Client } from '@libsql/client'
import { getServerEnv } from '@/lib/env'

let _client: Client | null = null

/** Lazy Turso/libSQL client (Node runtime). */
export function getDb(): Client {
  if (_client) return _client
  const env = getServerEnv()
  _client = createClient({
    url: env.TURSO_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  })
  return _client
}

