'use client'

import { SettingsClient } from '@/features/settings/components/SettingsClient'
import { useLocaleText } from '@/hooks/useLocaleText'

export default function SettingsPage() {
  const t = useLocaleText()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
          {t('app.app.settings.page.settings')}
        </h1>
        <p className="text-surface-500 dark:text-surface-400">
          {t('app.app.settings.page.manageDisplayLanguageAndYouTubeDefaults')}
        </p>
      </div>

      <SettingsClient />
    </div>
  )
}
