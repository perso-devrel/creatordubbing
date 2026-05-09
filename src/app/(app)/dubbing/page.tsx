'use client'

import { DubbingWizard } from '@/features/dubbing/components/DubbingWizard'
import { useLocaleText } from '@/hooks/useLocaleText'

export default function DubbingPage() {
  const t = useLocaleText()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
          {t({ ko: '새 더빙', en: 'New dubbing' })}
        </h1>
        <p className="text-surface-500 dark:text-surface-400">
          {t({ ko: '영상을 선택하고 원하는 언어로 더빙하세요.', en: 'Select a video and dub it into the languages you need.' })}
        </p>
      </div>

      <DubbingWizard />
    </div>
  )
}
