'use client'

import { DubbingWizard } from '@/features/dubbing/components/DubbingWizard'
import { useLocaleText } from '@/hooks/useLocaleText'

export default function DubbingPage() {
  const t = useLocaleText()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
          {t('app.app.dubbing.page.newDubbing')}
        </h1>
        <p className="text-surface-600 dark:text-surface-400">
          {t('app.app.dubbing.page.chooseAVideoAndLanguagesToStartA')}
        </p>
      </div>

      <DubbingWizard />
    </div>
  )
}
