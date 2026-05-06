import { afterEach, describe, expect, it, vi } from 'vitest'
import { decryptToken, encryptToken } from './token-crypto'

describe('token-crypto', () => {
  const originalTokenKey = process.env.TOKEN_ENCRYPTION_KEY
  const originalSessionSecret = process.env.SESSION_SECRET

  afterEach(() => {
    if (originalTokenKey === undefined) delete process.env.TOKEN_ENCRYPTION_KEY
    else process.env.TOKEN_ENCRYPTION_KEY = originalTokenKey

    if (originalSessionSecret === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = originalSessionSecret

    vi.unstubAllEnvs()
  })

  it('encrypts and decrypts token values', async () => {
    process.env.TOKEN_ENCRYPTION_KEY = 'test-token-key'

    const encrypted = await encryptToken('google-access-token')

    expect(encrypted).toMatch(/^enc:v1:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/)
    expect(encrypted).not.toContain('google-access-token')
    expect(await decryptToken(encrypted)).toBe('google-access-token')
  })

  it('keeps already-encrypted values unchanged', async () => {
    const encrypted = await encryptToken('enc:v1:iv:cipher')
    expect(encrypted).toBe('enc:v1:iv:cipher')
  })

  it('returns plaintext values for backwards compatibility', async () => {
    expect(await decryptToken('legacy-plain-token')).toBe('legacy-plain-token')
  })

  it('returns null for invalid encrypted values', async () => {
    process.env.TOKEN_ENCRYPTION_KEY = 'test-token-key'
    expect(await decryptToken('enc:v1:not-valid:not-valid')).toBeNull()
  })

  it('throws in production when no encryption secret is configured', async () => {
    delete process.env.TOKEN_ENCRYPTION_KEY
    delete process.env.SESSION_SECRET
    vi.stubEnv('NODE_ENV', 'production')

    await expect(encryptToken('token')).rejects.toThrow(
      'TOKEN_ENCRYPTION_KEY or SESSION_SECRET is required in production',
    )
  })
})
