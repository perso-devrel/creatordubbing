import { json } from './shared'

export interface MetadataTranslation {
  title: string
  description: string
}

export async function translateMetadata(params: {
  title: string
  description: string
  sourceLang: string
  targetLangs: string[]
}): Promise<Record<string, MetadataTranslation>> {
  const res = await fetch('/api/translate/metadata', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  const data = await json<{ translations: Record<string, MetadataTranslation> }>(res)
  return data.translations
}
