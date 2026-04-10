'use client'

import { DubbingWizard } from '@/features/dubbing/components/DubbingWizard'

export default function DubbingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">새 더빙</h1>
        <p className="text-surface-500 dark:text-surface-400">영상을 여러 언어로 더빙하세요</p>
      </div>

      <DubbingWizard />
    </div>
  )
}
