import { test, expect } from '@playwright/test'

/**
 * Smoke test: verify both dev servers are reachable
 * and basic pages return 200.
 */
test.describe('smoke', () => {
  test('next landing responds', async ({ page }) => {
    const res = await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })
    expect(res?.status()).toBeLessThan(400)
  })

  test('vite landing responds', async ({ page }) => {
    const res = await page.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
    expect(res?.status()).toBeLessThan(400)
  })
})
