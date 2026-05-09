import { test, expect, type Request } from '@playwright/test'
import { signTestSessionCookie } from './helpers/signed-cookie'

/**
 * E2E dubbing flow verification.
 *
 * Since the real Perso API likely isn't available in CI (no PERSO_API_KEY),
 * this test has two modes:
 *   1. Route handler probing — hit the Next.js route handlers directly with
 *      page.request and record status + response body to prove the proxy
 *      layer is wired correctly (expected 4xx/5xx when key missing).
 *   2. Flow simulation — drive the /dubbing page UI and capture the sequence
 *      of requests it makes.
 */

const NEXT_BASE = 'http://localhost:3000'

const ENDPOINTS: Array<{ path: string; method: 'GET' | 'POST' | 'PUT' }> = [
  { path: '/api/perso/spaces', method: 'GET' },
  { path: '/api/perso/languages', method: 'GET' },
  { path: '/api/perso/projects', method: 'GET' },
  { path: '/api/perso/external/metadata', method: 'POST' },
  { path: '/api/perso/external/upload', method: 'PUT' },
  { path: '/api/perso/translate', method: 'POST' },
  { path: '/api/perso/progress', method: 'GET' },
  { path: '/api/perso/queue', method: 'PUT' },
  { path: '/api/perso/script', method: 'GET' },
  { path: '/api/perso/download', method: 'GET' },
  { path: '/api/perso/validate', method: 'POST' },
  { path: '/api/youtube/videos', method: 'GET' },
  { path: '/api/youtube/stats', method: 'GET' },
  { path: '/api/youtube/caption', method: 'POST' },
  { path: '/api/youtube/upload', method: 'POST' },
  { path: '/api/dashboard/summary', method: 'GET' },
  { path: '/api/dashboard/jobs', method: 'GET' },
  { path: '/api/dashboard/credit-usage', method: 'GET' },
  { path: '/api/dashboard/language-performance', method: 'GET' },
  { path: '/api/auth/sync', method: 'POST' },
]

test('API route handlers are reachable', async ({ request }) => {
  const results: Array<{ path: string; method: string; status: number; note?: string }> = []
  for (const { path, method } of ENDPOINTS) {
    try {
      const res = await request.fetch(`${NEXT_BASE}${path}`, {
        method,
        data: method === 'GET' ? undefined : { stub: true },
        headers: { 'content-type': 'application/json' },
        failOnStatusCode: false,
      })
      results.push({ path, method, status: res.status() })
    } catch (e) {
      results.push({ path, method, status: 0, note: String(e) })
    }
  }
  console.log('API probe results:')
  for (const r of results) {
    console.log(`  ${r.method.padEnd(5)} ${r.path.padEnd(42)} -> ${r.status}${r.note ? ' (' + r.note + ')' : ''}`)
  }

  // Store for report extraction
  const fs = await import('fs')
  fs.writeFileSync(
    'tests/snapshots/_api_probe.json',
    JSON.stringify(results, null, 2)
  )

  // Any non-zero status means the route handler exists and Next.js is routing
  // to it. We accept 4xx/5xx because upstream keys may be missing.
  const unreachable = results.filter((r) => r.status === 0 || r.status === 404)
  expect(
    unreachable,
    `Unreachable / 404 routes:\n${unreachable.map((u) => u.method + ' ' + u.path).join('\n')}`
  ).toHaveLength(0)
})

test('dubbing page renders and captures network sequence', async ({ page }) => {
  const requests: Array<{ method: string; url: string; status?: number }> = []
  const consoleErrors: string[] = []

  await page.context().addCookies([
    { name: 'dubtube_session', value: signTestSessionCookie('test'), domain: 'localhost', path: '/' },
  ])
  await page.addInitScript(() => {
    localStorage.setItem(
      'google_user',
      JSON.stringify({
        uid: 'test',
        email: 'test@test.com',
        displayName: 'Test',
        photoURL: null,
      })
    )
  })

  page.on('request', (req: Request) => {
    const url = req.url()
    if (url.includes('/api/perso') || url.includes('/api/youtube')) {
      requests.push({ method: req.method(), url })
    }
  })
  page.on('response', (res) => {
    const url = res.url()
    const match = requests.find((r) => r.url === url && r.status === undefined)
    if (match) match.status = res.status()
  })
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(`console.error: ${m.text()}`)
  })

  const res = await page.goto(`${NEXT_BASE}/dubbing`, {
    waitUntil: 'networkidle',
    timeout: 30_000,
  })

  expect(res?.status(), `/dubbing HTTP status`).toBeLessThan(500)

  await page.waitForTimeout(2000)

  // Record network sequence for report
  const fs = await import('fs')
  fs.writeFileSync(
    'tests/snapshots/_dubbing_network.json',
    JSON.stringify({ requests, consoleErrors }, null, 2)
  )

  console.log('Dubbing page API calls:')
  for (const r of requests) {
    console.log(`  ${r.method} ${r.url} -> ${r.status ?? '?'}`)
  }
})
