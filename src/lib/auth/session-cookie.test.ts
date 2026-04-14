import { describe, it, expect, vi, afterEach } from 'vitest'
import { signSessionCookie, verifySessionCookie, SESSION_COOKIE } from './session-cookie'

describe('session-cookie', () => {
  it('exports SESSION_COOKIE constant', () => {
    expect(SESSION_COOKIE).toBe('creatordub_session')
  })

  describe('signSessionCookie', () => {
    it('produces uid.signature format', () => {
      const signed = signSessionCookie('user123')
      expect(signed).toMatch(/^user123\.[a-f0-9]{64}$/)
    })

    it('produces different signatures for different uids', () => {
      const a = signSessionCookie('alice')
      const b = signSessionCookie('bob')
      expect(a.split('.')[1]).not.toBe(b.split('.')[1])
    })

    it('produces deterministic output', () => {
      expect(signSessionCookie('uid1')).toBe(signSessionCookie('uid1'))
    })
  })

  describe('verifySessionCookie', () => {
    it('returns uid for valid signed cookie', () => {
      const signed = signSessionCookie('user123')
      expect(verifySessionCookie(signed)).toBe('user123')
    })

    it('returns null for tampered uid', () => {
      const signed = signSessionCookie('user123')
      const tampered = 'hacker' + signed.slice(signed.indexOf('.'))
      expect(verifySessionCookie(tampered)).toBeNull()
    })

    it('returns null for tampered signature', () => {
      const signed = signSessionCookie('user123')
      const tampered = signed.slice(0, -4) + 'dead'
      expect(verifySessionCookie(tampered)).toBeNull()
    })

    it('returns null for plain uid (unsigned)', () => {
      expect(verifySessionCookie('user123')).toBeNull()
    })

    it('returns null for empty string', () => {
      expect(verifySessionCookie('')).toBeNull()
    })

    it('returns null for just a dot', () => {
      expect(verifySessionCookie('.')).toBeNull()
    })

    it('returns null when signature length differs from expected', () => {
      const signed = signSessionCookie('user123')
      const truncated = signed.slice(0, -10)
      expect(verifySessionCookie(truncated)).toBeNull()
    })

    it('handles uid containing dots', () => {
      const signed = signSessionCookie('user.with.dots')
      expect(verifySessionCookie(signed)).toBe('user.with.dots')
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
      const defaultSigned = signSessionCookie('uid1')

      process.env.SESSION_SECRET = 'custom-test-secret-32chars-long!!'

      vi.resetModules()
      const freshMod = await vi.importActual<typeof import('./session-cookie')>('./session-cookie')
      const customSigned = freshMod.signSessionCookie('uid1')

      expect(customSigned).not.toBe(defaultSigned)
    })

    it('throws in production when SESSION_SECRET is not set', async () => {
      delete process.env.SESSION_SECRET
      vi.stubEnv('NODE_ENV', 'production')

      vi.resetModules()
      const freshMod = await vi.importActual<typeof import('./session-cookie')>('./session-cookie')

      expect(() => freshMod.signSessionCookie('uid1')).toThrow(
        'SESSION_SECRET env var is required in production',
      )

      vi.unstubAllEnvs()
    })
  })
})
