import 'server-only'

const PREFIX = 'enc:v1'
const enc = new TextEncoder()
const dec = new TextDecoder()

function getEncryptionSecret() {
  if (process.env.TOKEN_ENCRYPTION_KEY) return process.env.TOKEN_ENCRYPTION_KEY
  if (process.env.NODE_ENV === 'production') {
    throw new Error('TOKEN_ENCRYPTION_KEY is required in production')
  }
  return process.env.SESSION_SECRET || 'sub2tube-dev-token-secret-do-not-use-in-prod'
}

function toBase64Url(bytes: Uint8Array) {
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function fromBase64Url(value: string) {
  const padded = value + '='.repeat((4 - (value.length % 4)) % 4)
  return new Uint8Array(Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64'))
}

async function getKey() {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(getEncryptionSecret()))
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

export async function encryptToken(token: string | null | undefined): Promise<string | null> {
  if (!token) return null
  if (token.startsWith(`${PREFIX}:`)) return token
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await getKey()
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(token))
  return `${PREFIX}:${toBase64Url(iv)}:${toBase64Url(new Uint8Array(cipher))}`
}

export async function decryptToken(value: string | null | undefined): Promise<string | null> {
  if (!value) return null
  if (!value.startsWith(`${PREFIX}:`)) {
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.ALLOW_LEGACY_PLAINTEXT_TOKENS !== 'true'
    ) {
      return null
    }
    return value
  }
  const [, , ivRaw, cipherRaw] = value.split(':')
  if (!ivRaw || !cipherRaw) return null
  try {
    const key = await getKey()
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64Url(ivRaw) },
      key,
      fromBase64Url(cipherRaw),
    )
    return dec.decode(plain)
  } catch {
    return null
  }
}
