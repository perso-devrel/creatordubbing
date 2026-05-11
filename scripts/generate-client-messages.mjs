import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

const outDir = path.join('src', 'lib', 'i18n', 'client-messages')

function unwrapExpression(node) {
  let current = node
  while (
    current &&
    (ts.isAsExpression(current) ||
      (ts.isSatisfiesExpression && ts.isSatisfiesExpression(current)))
  ) {
    current = current.expression
  }
  return current
}

function getObjectProperties(file, variableName) {
  const source = fs.readFileSync(file, 'utf8')
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  let objectLiteral = null

  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name?.getText(sourceFile) === variableName) {
      const initializer = unwrapExpression(node.initializer)
      if (initializer && ts.isObjectLiteralExpression(initializer)) {
        objectLiteral = initializer
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)

  if (!objectLiteral) {
    throw new Error(`Could not find ${variableName} in ${file}`)
  }

  return objectLiteral.properties
    .filter(ts.isPropertyAssignment)
    .map((property) => {
      const name = property.name
      const key = ts.isStringLiteral(name) || ts.isNumericLiteral(name)
        ? name.text
        : name.getText(sourceFile)
      return { key, text: property.getText(sourceFile) }
    })
}

const groups = {
  common: [],
  appShell: [],
  marketingShell: [],
  landing: [],
  dubbing: [],
  dashboard: [],
  metadata: [],
  uploads: [],
  batch: [],
  billing: [],
  settings: [],
  youtube: [],
  ops: [],
}

const matchers = [
  ['common', [/^common\./, /^privacyStatus\./, /^status\./, /^components\.ui\./, /^components\.feedback\./, /^app\.globalError\./, /^app\.notFound\./, /^app\.auth\.callback\./, /^internal\.keyword\./]],
  ['appShell', [/^components\.layout\.sidebar\./, /^components\.layout\.topbar\./, /^components\.layout\.appLocaleSelect\./, /^features\.ops\.components\.opsAlertButton\./, /^app\.app\.loading\./, /^app\.app\.error\./]],
  ['marketingShell', [/^components\.layout\.landingNavBar\./, /^components\.layout\.landingFooter\./, /^app\.marketing\.error\./]],
  ['landing', [/^features\.landing\./, /^metadata\.landing\./]],
  ['dubbing', [/^app\.app\.dubbing\./, /^features\.dubbing\./, /^dubbing\./, /^extension\./]],
  ['dashboard', [/^features\.dashboard\./]],
  ['metadata', [/^app\.app\.metadata\./, /^features\.metadata\./]],
  ['uploads', [/^app\.app\.uploads\./]],
  ['batch', [/^app\.app\.batch\./]],
  ['billing', [/^app\.app\.billing\./, /^billing\./]],
  ['settings', [/^app\.app\.settings\./, /^settings\./, /^marketPreset\./]],
  ['youtube', [/^app\.app\.youtube\./]],
  ['ops', [/^features\.ops\./, /^ops\./]],
]

fs.mkdirSync(outDir, { recursive: true })

groups.common.push(...getObjectProperties('src/lib/i18n/messages.ts', 'baseMessages'))

for (const property of getObjectProperties('src/lib/i18n/generatedMessages.ts', 'generatedMessages')) {
  let placed = false

  for (const [group, regexes] of matchers) {
    if (regexes.some((regex) => regex.test(property.key))) {
      groups[group].push(property)
      placed = true
    }
  }

  if (!placed) {
    groups.common.push(property)
  }
}

for (const [group, properties] of Object.entries(groups)) {
  const unique = new Map()
  for (const property of properties) {
    unique.set(property.key, property.text)
  }

  const body = [...unique.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, text]) => `  ${text},`)
    .join('\n')

  fs.writeFileSync(
    path.join(outDir, `${group}.ts`),
    `import type { LocalizedText } from '../text'\n\nexport const ${group}Messages = {\n${body}\n} as const satisfies Record<string, LocalizedText>\n`,
  )
}

