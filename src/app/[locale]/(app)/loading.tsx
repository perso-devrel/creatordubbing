'use client'

import { LoadingSpinner } from '@/components/feedback/LoadingSpinner'
import { useLocaleText } from '@/hooks/useLocaleText'

export default function AppLoading() {
  const t = useLocaleText()

  return <LoadingSpinner size="lg" className="min-h-[60vh]" label={t('app.app.loading.label')} />
}
