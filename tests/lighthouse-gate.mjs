import fs from 'fs'
import { execSync } from 'child_process'

const REPORT_PATH = './tests/snapshots/lighthouse-prod.report.json'
const BASELINE_PATH = './tests/snapshots/lighthouse-baseline.json'
const THRESHOLD = 5

if (!fs.existsSync(BASELINE_PATH)) {
  console.error('❌ Baseline not found:', BASELINE_PATH)
  process.exit(1)
}

if (!fs.existsSync(REPORT_PATH)) {
  console.log('Running Lighthouse…')
  try {
    execSync('npm run test:lighthouse:prod', { stdio: 'inherit' })
  } catch {
    console.error('❌ Lighthouse run failed')
    process.exit(1)
  }
}

const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'))
const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'))

const categories = ['performance', 'accessibility', 'best-practices', 'seo']
const results = []
let failed = false

for (const cat of categories) {
  const current = Math.round(report.categories[cat].score * 100)
  const base = baseline.scores[cat]
  const diff = current - base
  const status = diff < -THRESHOLD ? 'FAIL' : 'PASS'
  if (status === 'FAIL') failed = true
  results.push({ category: cat, baseline: base, current, diff, status })
}

console.log('\n=== Lighthouse CI Gate ===')
console.log(`Threshold: -${THRESHOLD} points\n`)

for (const r of results) {
  const sign = r.diff >= 0 ? '+' : ''
  const icon = r.status === 'FAIL' ? '❌' : '✅'
  console.log(`${icon} ${r.category.padEnd(16)} baseline=${r.baseline}  current=${r.current}  (${sign}${r.diff})`)
}

console.log('')

if (failed) {
  console.error('❌ Lighthouse gate FAILED — score dropped more than ' + THRESHOLD + ' points from baseline.')
  process.exit(1)
} else {
  console.log('✅ Lighthouse gate PASSED.')
}
