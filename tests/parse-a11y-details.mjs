import fs from 'fs'
const r = JSON.parse(
  fs.readFileSync('./tests/snapshots/lighthouse-prod.report.json', 'utf8')
)
const ids = ['label', 'color-contrast', 'canonical']
for (const id of ids) {
  const a = r.audits[id]
  if (!a) continue
  console.log('\n=== ' + id + ' ===')
  console.log('score:', a.score)
  console.log('title:', a.title)
  console.log('description:', a.description)
  if (a.details?.items) {
    for (const item of a.details.items.slice(0, 10)) {
      console.log(JSON.stringify(item, null, 2))
    }
  }
}
