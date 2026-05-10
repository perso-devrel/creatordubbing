'use client'

import { useState } from 'react'
import { ArrowRight, Play } from 'lucide-react'
import { Card, CardTitle, Button, Input } from '@/components/ui'
import { isValidYouTubeUrl } from '@/utils/validators'
import { useLocaleText } from '@/hooks/useLocaleText'
import { useLocaleRouter } from '@/hooks/useLocalePath'

export function QuickStart() {
  const t = useLocaleText()
  const [url, setUrl] = useState('')
  const router = useLocaleRouter()
  const isValid = url.length > 0 && isValidYouTubeUrl(url)

  const handleStart = () => {
    if (isValid) router.push(`/dubbing?url=${encodeURIComponent(url)}`)
  }

  return (
    <Card className="border-brand-200 dark:border-brand-900/60">
      <CardTitle>{t('features.dashboard.components.quickStart.quickStart')}</CardTitle>
      <p className="mb-4 text-sm text-surface-600 dark:text-surface-400">
        {t('features.dashboard.components.quickStart.pasteAYouTubeLinkToStartANew')}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="https://youtube.com/watch?v=..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          icon={<Play className="h-4 w-4" />}
          className="bg-white dark:bg-surface-900"
        />
        <Button onClick={handleStart} disabled={!isValid} className="shrink-0">
          {t('features.dashboard.components.quickStart.start')}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  )
}
