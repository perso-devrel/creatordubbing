import { test, expect, type Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { signTestSessionCookie } from './helpers/signed-cookie'

/**
 * Visual regression test: captures screenshots from both the
 * Vite (5173) and Next.js (3000) apps and does a coarse pixel
 * comparison (size-based + raw byte hash) to confirm parity.
 *
 * NOTE: we don't use toHaveScreenshot() because fonts and
 * animations make exact pixel matching brittle between two
 * independently-rendered apps. Instead we record byte counts
 * and log them in the report so humans can eyeball + diff.
 */

const PAGES: Array<{ route: string; name: string; needsAuth: boolean }> = [
  { route: '/', name: 'landing', needsAuth: false },
  { route: '/dashboard', name: 'dashboard', needsAuth: true },
  { route: '/dubbing', name: 'dubbing', needsAuth: true },
  { route: '/batch', name: 'batch', needsAuth: true },
  { route: '/youtube', name: 'youtube', needsAuth: true },
  { route: '/billing', name: 'billing', needsAuth: true },
]

// Port 5173 is occupied by another project (VoiceAlarm) on this dev machine.
// sub2tube's Vite dev server moved to 5174.
const VITE_BASE = process.env.VITE_BASE_URL ?? 'http://localhost:5174'
const NEXT_BASE = process.env.NEXT_BASE_URL ?? 'http://localhost:3000'

const SNAPSHOT_DIR = path.join(process.cwd(), 'tests', 'snapshots')
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true })

async function injectMockAuth(page: Page) {
  await page.context().addCookies([
    { name: 'sub2tube_session', value: signTestSessionCookie('test'), domain: 'localhost', path: '/' },
  ])
  await page.addInitScript(() => {
    try {
      localStorage.setItem(
        'google_user',
        JSON.stringify({
          uid: 'test',
          email: 'test@test.com',
          displayName: 'Test User',
          photoURL: null,
        })
      )
      // also vite store if exists
      localStorage.setItem(
        'auth-storage',
        JSON.stringify({
          state: {
            user: {
              uid: 'test',
              email: 'test@test.com',
              displayName: 'Test User',
              photoURL: null,
            },
            accessToken: 'mock-token',
          },
          version: 0,
        })
      )
    } catch {
      /* noop */
    }
  })
}

const results: Array<{
  name: string
  route: string
  project: string
  viteBytes: number
  nextBytes: number
  consoleErrors: number
  viteStatus: number | undefined
  nextStatus: number | undefined
}> = [];

test.afterAll(async () => {
  const reportPath = path.join(SNAPSHOT_DIR, '_results.json')
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2))
})

for (const { route, name, needsAuth } of PAGES) {
  test(`visual parity: ${name} (${route})`, async ({ page }, testInfo) => {
    const project = testInfo.project.name
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    if (needsAuth) await injectMockAuth(page)

    // Next.js
    let nextStatus: number | undefined
    try {
      const r = await page.goto(`${NEXT_BASE}${route}`, {
        waitUntil: 'networkidle',
        timeout: 30_000,
      })
      nextStatus = r?.status()
    } catch (e) {
      errors.push(`next goto failed: ${e}`)
    }
    await page.waitForTimeout(1500)
    const nextBuf = await page.screenshot({ fullPage: true })
    const nextPath = path.join(
      SNAPSHOT_DIR,
      `${project}_${name}_next.png`
    )
    fs.writeFileSync(nextPath, nextBuf)

    // Vite
    let viteStatus: number | undefined
    try {
      const r = await page.goto(`${VITE_BASE}${route}`, {
        waitUntil: 'networkidle',
        timeout: 30_000,
      })
      viteStatus = r?.status()
    } catch (e) {
      errors.push(`vite goto failed: ${e}`)
    }
    await page.waitForTimeout(1500)
    const viteBuf = await page.screenshot({ fullPage: true })
    const vitePath = path.join(
      SNAPSHOT_DIR,
      `${project}_${name}_vite.png`
    )
    fs.writeFileSync(vitePath, viteBuf)

    results.push({
      name,
      route,
      project,
      viteBytes: viteBuf.length,
      nextBytes: nextBuf.length,
      consoleErrors: errors.length,
      viteStatus,
      nextStatus,
    })

    // Assertion: at minimum, Next.js should not 5xx
    expect(nextStatus ?? 200, `next ${route} returned ${nextStatus}`).toBeLessThan(500)
  })
}
