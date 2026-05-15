import { createHmac } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const DEV_SECRET = 'sub2tube-dev-secret-do-not-use-in-prod'

function readEnvLocalSessionSecret(): string | null {
  const envPath = resolve(process.cwd(), '.env.local')
  if (!existsSync(envPath)) return null

  const content = readFileSync(envPath, 'utf8')
  const line = content
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith('SESSION_SECRET='))
  if (!line) return null

  return line
    .slice(line.indexOf('=') + 1)
    .trim()
    .replace(/^['"]|['"]$/g, '')
}

export function signTestSessionCookie(uid: string): string {
  const secret = process.env.SESSION_SECRET || readEnvLocalSessionSecret() || DEV_SECRET
  const sig = createHmac('sha256', secret).update(uid).digest('hex')
  return `${uid}.${sig}`
}
