'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Play } from 'lucide-react'
import { Card, CardTitle, Button, Input } from '@/components/ui'
import { isValidYouTubeUrl } from '@/utils/validators'
import { useLocaleText } from '@/hooks/useLocaleText'

export function QuickStart() {
  const t = useLocaleText()
  const [url, setUrl] = useState('')
  const router = useRouter()
  const isValid = url.length > 0 && isValidYouTubeUrl(url)

  const handleStart = () => {
    if (isValid) router.push(`/dubbing?url=${encodeURIComponent(url)}`)
  }

  return (
    <Card className="border-brand-200 dark:border-brand-900/60">
      <CardTitle>{t({ ko: '빠른 시작', en: 'Quick start' })}</CardTitle>
      <p className="mb-4 text-sm text-surface-600 dark:text-surface-400">
        {t({ ko: 'YouTube 링크를 붙여넣고 새 더빙을 시작하세요.', en: 'Paste a YouTube link to start a new dubbing job.' })}
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
          {t({ ko: '시작', en: 'Start' })}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  )
}
