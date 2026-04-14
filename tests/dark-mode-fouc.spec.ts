import { test, expect } from '@playwright/test'
import { signTestSessionCookie } from './helpers/signed-cookie'

/**
 * Dark mode FOUC: when the user has previously chosen dark mode,
 * the <html> element must already have class="dark" on the very
 * first paint (no flash of light mode).
 *
 * We set localStorage via addInitScript BEFORE navigation, then
 * inspect document.documentElement.classList at the earliest
 * possible moment (load event).
 */

test('dark mode has no FOUC on landing', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('creatordub-theme', 'dark')
  })

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })

  const htmlClass = await page.evaluate(() => document.documentElement.className)
  expect(htmlClass, `html className on first paint: "${htmlClass}"`).toContain('dark')

  // Bonus: screenshot with dark theme applied
  await page.screenshot({ path: 'tests/snapshots/fouc_landing_dark.png' })
})

test('dark mode has no FOUC on dashboard', async ({ page }) => {
  await page.context().addCookies([
    { name: 'creatordub_session', value: signTestSessionCookie('x'), domain: 'localhost', path: '/' },
    { name: 'google_access_token', value: 'mock', domain: 'localhost', path: '/' },
  ])
  await page.addInitScript(() => {
    localStorage.setItem('creatordub-theme', 'dark')
    localStorage.setItem(
      'google_user',
      JSON.stringify({ uid: 'x', email: 'x@x.x', displayName: 'X', photoURL: null })
    )
  })

  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'domcontentloaded' })

  const htmlClass = await page.evaluate(() => document.documentElement.className)
  expect(htmlClass).toContain('dark')
})
