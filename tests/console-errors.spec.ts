import { test, expect, type Page } from '@playwright/test'
import { signTestSessionCookie } from './helpers/signed-cookie'

/**
 * Walks the 6 main routes on the Next.js app and counts
 * console errors / page errors. Zero errors required.
 */

const ROUTES = [
  { route: '/', needsAuth: false },
  { route: '/dashboard', needsAuth: true },
  { route: '/dubbing', needsAuth: true },
  { route: '/batch', needsAuth: true },
  { route: '/youtube', needsAuth: true },
  { route: '/billing', needsAuth: true },
]

async function injectMockAuth(page: Page) {
  await page.context().addCookies([
    { name: 'dubtube_session', value: signTestSessionCookie('test'), domain: 'localhost', path: '/' },
    { name: 'google_access_token', value: 'mock-token', domain: 'localhost', path: '/' },
  ])
  await page.addInitScript(() => {
    try {
      localStorage.setItem(
        'google_user',
        JSON.stringify({
          uid: 'test',
          email: 'test@test.com',
          displayName: 'Test',
          photoURL: null,
        })
      )
    } catch {
      /* noop */
    }
  })
}

test.describe('console error audit (Next.js)', () => {
  for (const { route, needsAuth } of ROUTES) {
    test(`${route} has no console errors`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text()
          // Ignore known benign / expected noise:
          //   - Failed resource loads (upstream APIs return 500 when keys missing; this is infra, not JS)
          //   - React devtools suggestion
          //   - HMR noise
          //   - Firebase installations in dev
          if (
            text.includes('Failed to load resource') ||
            text.includes('Download the React DevTools') ||
            text.includes('[HMR]') ||
            (text.includes('Firebase') && text.includes('installations'))
          ) {
            return
          }
          errors.push(`console.error: ${text}`)
        }
      })

      if (needsAuth) await injectMockAuth(page)

      const res = await page.goto(`http://localhost:3000${route}`, {
        waitUntil: 'networkidle',
        timeout: 30_000,
      })

      await page.waitForTimeout(1000)

      expect(res?.status(), `HTTP status for ${route}`).toBeLessThan(500)
      expect(errors, `console errors on ${route}:\n${errors.join('\n')}`).toHaveLength(0)
    })
  }
})
