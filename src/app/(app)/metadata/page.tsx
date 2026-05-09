'use client'

import { MetadataLocalizationTool } from '@/features/metadata/components/MetadataLocalizationTool'
import { useLocaleText } from '@/hooks/useLocaleText'

export default function MetadataPage() {
  const t = useLocaleText()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">{t({ ko: 'YouTube 제목·설명 번역', en: 'YouTube title and description translation' })}</h1>
        <p className="text-surface-500 dark:text-surface-400">
          {t({ ko: 'YouTube 제목과 설명만 여러 언어로 번역합니다.', en: 'Translate YouTube titles and descriptions into multiple languages.' })}
        </p>
      </div>

      <MetadataLocalizationTool />
    </div>
  )
}
