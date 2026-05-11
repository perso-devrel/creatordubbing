import { describe, it, expect, vi, afterEach } from 'vitest'
import { createHmac } from 'node:crypto'
import {
  signSessionCookie,
  verifySessionCookie,
  verifySessionCookiePayload,
  SESSION_COOKIE,
} from './session-cookie'

describe('session-cookie', () => {
  it('exports SESSION_COOKIE constant', () => {
    expect(SESSION_COOKIE).toBe('dubtube_session')
  })

  describe('signSessionCookie', () => {
    it('produces encoded-payload.signature format', async () => {
      const signed = await signSessionCookie('user123')
      expect(signed).toMatch(/^[A-Za-z0-9_-]+\.[a-f0-9]{64}$/)
    })

    it('produces different cookies for different uids', async () => {
      const a = await signSessionCookie('alice')
      const b = await signSessionCookie('bob')
      expect(a).not.toBe(b)
    })

    it('produces non-deterministic output for the same uid', async () => {
      expect(await signSessionCookie('uid1')).not.toBe(await signSessionCookie('uid1'))
    })
  })

  describe('verifySessionCookie', () => {
    it('returns uid for valid signed cookie', async () => {
      const signed = await signSessionCookie('user123')
      expect(await verifySessionCookie(signed)).toBe('user123')
    })

    it('returns null for tampered uid', async () => {
      const signed = await signSessionCookie('user123')
      const [encoded, sig] = signed.split('.')
      const payload = JSON.parse(atob(encoded))
      const tamperedPayload = btoa(JSON.stringify({ ...payload, uid: 'hacker' }))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '')
      const tampered = `${tamperedPayload}.${sig}`
      expect(await verifySessionCookie(tampered)).toBeNull()
    })

    it('returns null for tampered signature', async () => {
      const signed = await signSessionCookie('user123')
      const tampered = signed.slice(0, -4) + 'dead'
      expect(await verifySessionCookie(tampered)).toBeNull()
    })

    it('returns null for plain uid (unsigned)', async () => {
      expect(await verifySessionCookie('user123')).toBeNull()
    })

    it('returns null for empty string', async () => {
      expect(await verifySessionCookie('')).toBeNull()
    })

    it('returns null for just a dot', async () => {
      expect(await verifySessionCookie('.')).toBeNull()
    })

    it('returns null when signature is truncated', async () => {
      const signed = await signSessionCookie('user123')
      const truncated = signed.slice(0, -10)
      expect(await verifySessionCookie(truncated)).toBeNull()
    })

    it('handles uid containing dots', async () => {
      const signed = await signSessionCookie('user.with.dots')
      expect(await verifySessionCookie(signed)).toBe('user.with.dots')
    })

    it('accepts legacy uid.signature cookies used by existing Playwright helpers', async () => {
      const uid = 'legacy-user'
      const sig = createHmac('sha256', 'dubtube-dev-secret-do-not-use-in-prod')
        .update(uid)
        .digest('hex')

      const verified = await verifySessionCookiePayload(`${uid}.${sig}`)

      expect(verified).toEqual({
        uid,
        sid: null,
        exp: null,
        legacy: true,
      })
    })

    it('returns v2 payload metadata for valid signed cookie', async () => {
      const signed = await signSessionCookie('user123')
      const verified = await verifySessionCookiePayload(signed)
      expect(verified).toMatchObject({
        uid: 'user123',
        legacy: false,
      })
      expect(verified?.sid).toEqual(expect.any(String))
      expect(verified?.exp).toEqual(expect.any(Number))
    })
  })

  describe('SESSION_SECRET env var', () => {
    const originalEnv = process.env.SESSION_SECRET

    afterEach(() => {
      if (originalEnv === undefined) {
        delete process.env.SESSION_SECRET
      } else {
        process.env.SESSION_SECRET = originalEnv
      }
    })

    it('uses custom secret when SESSION_SECRET is set', async () => {
      const defaultSigned = await signSessionCookie('uid1')

      process.env.SESSION_SECRET = 'custom-test-secret-32chars-long!!'

      vi.resetModules()
      const freshMod = await vi.importActual<typeof import('./session-cookie')>('./session-cookie')
      const customSigned = await freshMod.signSessionCookie('uid1')

      expect(customSigned).not.toBe(defaultSigned)
    })

    it('throws in production when SESSION_SECRET is not set', async () => {
      delete process.env.SESSION_SECRET
      vi.stubEnv('NODE_ENV', 'production')

      vi.resetModules()
      const freshMod = await vi.importActual<typeof import('./session-cookie')>('./session-cookie')

      await expect(freshMod.signSessionCookie('uid1')).rejects.toThrow(
        'SESSION_SECRET env var is required in production',
      )

      vi.unstubAllEnvs()
    })
  })
})
