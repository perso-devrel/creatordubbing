'use client'

import { DubbingWizard } from '@/features/dubbing/components/DubbingWizard'
import { PageHeader } from '@/components/layout/PageHeader'
import { useLocaleText } from '@/hooks/useLocaleText'

export default function DubbingPage() {
  const t = useLocaleText()

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('app.app.dubbing.page.newDubbing')}
        description={t('app.app.dubbing.page.chooseAVideoAndLanguagesToStartA')}
      />

      <DubbingWizard />
    </div>
  )
}
