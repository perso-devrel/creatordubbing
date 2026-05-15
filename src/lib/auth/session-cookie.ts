const SESSION_COOKIE = 'sub2tube_session'
const SEPARATOR = '.'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7
const enc = new TextEncoder()

interface SessionCookiePayload {
  v: 2
  uid: string
  sid: string
  iat: number
  exp: number
}

export type VerifiedSessionCookie =
  | { uid: string; sid: string; exp: number; legacy: false }
  | { uid: string; sid: null; exp: null; legacy: true }

function getSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (secret) return secret
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET env var is required in production')
  }
  return 'sub2tube-dev-secret-do-not-use-in-prod'
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function base64UrlEncode(value: string): string {
  return btoa(value)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function base64UrlDecode(value: string): string | null {
  try {
    const padded = value + '='.repeat((4 - (value.length % 4)) % 4)
    const base64 = padded.replace(/-/g, '+').replace(/_/g, '/')
    return atob(base64)
  } catch {
    return null
  }
}

async function sign(value: string): Promise<string> {
  const key = await importKey(getSecret())
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(value))
  return toHex(sig)
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false

  let diff = 0
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

async function verify(value: string, sigHex: string): Promise<boolean> {
  if (!/^[a-f0-9]{64}$/i.test(sigHex)) return false

  try {
    const expected = await sign(value)
    return timingSafeEqualHex(expected, sigHex.toLowerCase())
  } catch {
    return false
  }
}

async function verifyLegacySessionCookie(cookie: string): Promise<VerifiedSessionCookie | null> {
  const idx = cookie.lastIndexOf(SEPARATOR)
  if (idx < 1) return null
  const uid = cookie.slice(0, idx)
  const sigHex = cookie.slice(idx + 1)
  const valid = await verify(uid, sigHex)
  return valid ? { uid, sid: null, exp: null, legacy: true } : null
}

export { SESSION_COOKIE, SESSION_TTL_SECONDS }

export async function createSessionCookie(uid: string): Promise<{
  cookie: string
  sessionId: string
  expiresAt: Date
}> {
  const now = Math.floor(Date.now() / 1000)
  const payload: SessionCookiePayload = {
    v: 2,
    uid,
    sid: crypto.randomUUID(),
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  }
  const encoded = base64UrlEncode(JSON.stringify(payload))
  const sig = await sign(encoded)
  return {
    cookie: `${encoded}${SEPARATOR}${sig}`,
    sessionId: payload.sid,
    expiresAt: new Date(payload.exp * 1000),
  }
}

export async function signSessionCookie(uid: string): Promise<string> {
  return (await createSessionCookie(uid)).cookie
}

export async function verifySessionCookiePayload(cookie: string): Promise<VerifiedSessionCookie | null> {
  const idx = cookie.lastIndexOf(SEPARATOR)
  if (idx < 1) return null

  const encoded = cookie.slice(0, idx)
  const sigHex = cookie.slice(idx + 1)
  if (!(await verify(encoded, sigHex))) {
    return verifyLegacySessionCookie(cookie)
  }

  const json = base64UrlDecode(encoded)
  if (!json) return verifyLegacySessionCookie(cookie)

  try {
    const payload = JSON.parse(json) as Partial<SessionCookiePayload>
    if (payload.v !== 2 || !payload.uid || !payload.sid || !payload.exp) {
      return verifyLegacySessionCookie(cookie)
    }
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null
    return { uid: payload.uid, sid: payload.sid, exp: payload.exp, legacy: false }
  } catch {
    return verifyLegacySessionCookie(cookie)
  }
}

export async function verifySessionCookie(cookie: string): Promise<string | null> {
  const verified = await verifySessionCookiePayload(cookie)
  return verified?.uid ?? null
}
