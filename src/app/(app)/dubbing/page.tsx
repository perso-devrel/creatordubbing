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
        <p className="text-surface-600 dark:text-surface-400">
          {t({ ko: '영상과 언어를 선택해 더빙 작업을 시작하세요.', en: 'Choose a video and languages to start a dubbing job.' })}
        </p>
      </div>

      <DubbingWizard />
    </div>
  )
}
