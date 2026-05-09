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
          {t({ ko: '더빙 없이 YouTube 제목과 설명만 여러 언어로 번역해 적용합니다.', en: 'Translate and apply YouTube titles and descriptions without dubbing.' })}
        </p>
      </div>

      <MetadataLocalizationTool />
    </div>
  )
}
