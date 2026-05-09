'use client'

import { SettingsClient } from '@/features/settings/components/SettingsClient'
import { useLocaleText } from '@/hooks/useLocaleText'

export default function SettingsPage() {
  const t = useLocaleText()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
          {t({ ko: '설정', en: 'Settings' })}
        </h1>
        <p className="text-surface-500 dark:text-surface-400">
          {t({ ko: '화면 언어와 YouTube 기본값을 관리하세요.', en: 'Manage display language and YouTube defaults.' })}
        </p>
      </div>

      <SettingsClient />
    </div>
  )
}
