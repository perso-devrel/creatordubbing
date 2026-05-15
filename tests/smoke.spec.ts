import { test, expect } from '@playwright/test'

/**
 * Smoke test: verify the Next.js server is reachable and locale routing works.
 */
test.describe('smoke', () => {
  test('next landing responds', async ({ page }) => {
    await page.context().addCookies([
      { name: 'sub2tube_locale', value: 'ko', domain: 'localhost', path: '/' },
    ])
    const res = await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })
    expect(res?.status()).toBeLessThan(400)
    expect(new URL(page.url()).pathname).toBe('/ko')
  })

  test('localized dashboard route responds without server error', async ({ page }) => {
    const res = await page.goto('http://localhost:3000/ko/dashboard', { waitUntil: 'domcontentloaded' })
    expect(res?.status()).toBeLessThan(500)
  })
})
