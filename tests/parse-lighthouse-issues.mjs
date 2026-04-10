import fs from 'fs'
const r = JSON.parse(
  fs.readFileSync('./tests/snapshots/lighthouse.report.json', 'utf8')
)

function failedAudits(catId) {
  const cat = r.categories[catId]
  if (!cat) return []
  const failed = []
  for (const ref of cat.auditRefs) {
    const a = r.audits[ref.id]
    if (!a) continue
    if (a.score !== null && a.score !== undefined && a.score < 1 && a.scoreDisplayMode !== 'manual' && a.scoreDisplayMode !== 'notApplicable' && a.scoreDisplayMode !== 'informative') {
      failed.push({
        id: ref.id,
        title: a.title,
        score: a.score,
        weight: ref.weight,
        display: a.displayValue,
      })
    }
  }
  return failed.sort((a, b) => (b.weight || 0) - (a.weight || 0))
}

const out = {
  performance: failedAudits('performance'),
  accessibility: failedAudits('accessibility'),
  seo: failedAudits('seo'),
  bestPractices: failedAudits('best-practices'),
}
console.log(JSON.stringify(out, null, 2))
fs.writeFileSync('./tests/snapshots/_lighthouse_issues.json', JSON.stringify(out, null, 2))
