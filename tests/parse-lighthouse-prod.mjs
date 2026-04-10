import fs from 'fs'
const r = JSON.parse(
  fs.readFileSync('./tests/snapshots/lighthouse-prod.report.json', 'utf8')
)
const s = r.categories
const out = {
  url: r.finalDisplayedUrl || r.finalUrl,
  performance: Math.round(s.performance.score * 100),
  accessibility: Math.round(s.accessibility.score * 100),
  bestPractices: Math.round(s['best-practices'].score * 100),
  seo: Math.round(s.seo.score * 100),
  fcp: r.audits['first-contentful-paint'].displayValue,
  lcp: r.audits['largest-contentful-paint'].displayValue,
  tbt: r.audits['total-blocking-time'].displayValue,
  cls: r.audits['cumulative-layout-shift'].displayValue,
  tti: r.audits['interactive']?.displayValue,
  speedIndex: r.audits['speed-index']?.displayValue,
}
console.log(JSON.stringify(out, null, 2))
fs.writeFileSync(
  './tests/snapshots/_lighthouse_prod_summary.json',
  JSON.stringify(out, null, 2)
)
