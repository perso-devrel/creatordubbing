import { createHmac, timingSafeEqual } from 'node:crypto'

const SESSION_COOKIE = 'creatordub_session'
const SEPARATOR = '.'

function getSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (secret) return secret
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET env var is required in production')
  }
  return 'creatordub-dev-secret-do-not-use-in-prod'
}

function hmac(data: string): string {
  return createHmac('sha256', getSecret()).update(data).digest('hex')
}

export { SESSION_COOKIE }

export function signSessionCookie(uid: string): string {
  return `${uid}${SEPARATOR}${hmac(uid)}`
}

export function verifySessionCookie(cookie: string): string | null {
  const idx = cookie.lastIndexOf(SEPARATOR)
  if (idx < 1) return null

  const uid = cookie.slice(0, idx)
  const sig = cookie.slice(idx + 1)
  const expected = hmac(uid)

  if (sig.length !== expected.length) return null

  const sigBuf = Buffer.from(sig, 'utf8')
  const expectedBuf = Buffer.from(expected, 'utf8')
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null

  return uid
}
