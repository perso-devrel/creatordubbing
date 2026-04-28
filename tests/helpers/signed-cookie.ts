import { createHmac } from 'node:crypto'

const DEV_SECRET = 'dubtube-dev-secret-do-not-use-in-prod'

export function signTestSessionCookie(uid: string): string {
  const secret = process.env.SESSION_SECRET || DEV_SECRET
  const sig = createHmac('sha256', secret).update(uid).digest('hex')
  return `${uid}.${sig}`
}
