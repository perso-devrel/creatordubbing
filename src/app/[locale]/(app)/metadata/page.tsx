'use client'

import { MetadataLocalizationTool } from '@/features/metadata/components/MetadataLocalizationTool'
import { useLocaleText } from '@/hooks/useLocaleText'

export default function MetadataPage() {
  const t = useLocaleText()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">{t('app.app.metadata.page.youTubeTitleAndDescriptionTranslation')}</h1>
        <p className="text-surface-600 dark:text-surface-400">
          {t('app.app.metadata.page.localizeYouTubeTitlesAndDescriptionsIntoMultipleLanguages')}
        </p>
      </div>

      <MetadataLocalizationTool />
    </div>
  )
}
