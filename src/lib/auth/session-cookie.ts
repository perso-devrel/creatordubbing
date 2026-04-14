// Web Crypto API — compatible with both Edge Runtime and Node.js 18+
const SESSION_COOKIE = 'creatordub_session'
const SEPARATOR = '.'
const enc = new TextEncoder()

function getSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (secret) return secret
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET env var is required in production')
  }
  return 'creatordub-dev-secret-do-not-use-in-prod'
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function fromHex(hex: string): Uint8Array {
  const pairs = hex.match(/.{2}/g)
  if (!pairs || pairs.length !== hex.length / 2) return new Uint8Array(0)
  return new Uint8Array(pairs.map((b) => parseInt(b, 16)))
}

export { SESSION_COOKIE }

export async function signSessionCookie(uid: string): Promise<string> {
  const key = await importKey(getSecret())
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(uid))
  return `${uid}${SEPARATOR}${toHex(sig)}`
}

export async function verifySessionCookie(cookie: string): Promise<string | null> {
  const idx = cookie.lastIndexOf(SEPARATOR)
  if (idx < 1) return null

  const uid = cookie.slice(0, idx)
  const sigHex = cookie.slice(idx + 1)
  if (sigHex.length === 0 || sigHex.length % 2 !== 0) return null

  const sigBytes = fromHex(sigHex)
  if (sigBytes.length === 0) return null

  try {
    const key = await importKey(getSecret())
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes.buffer as ArrayBuffer, enc.encode(uid))
    return valid ? uid : null
  } catch {
    return null
  }
}
