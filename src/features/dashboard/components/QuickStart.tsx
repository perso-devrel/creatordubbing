'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Play } from 'lucide-react'
import { Card, CardTitle, Button, Input } from '@/components/ui'
import { isValidYouTubeUrl } from '@/utils/validators'

export function QuickStart() {
  const [url, setUrl] = useState('')
  const router = useRouter()
  const isValid = url.length > 0 && isValidYouTubeUrl(url)

  const handleStart = () => {
    if (isValid) router.push(`/dubbing?url=${encodeURIComponent(url)}`)
  }

  return (
    <Card className="bg-gradient-to-br from-brand-50 to-pink-50 dark:from-brand-900/10 dark:to-pink-900/10">
      <CardTitle>빠른 시작</CardTitle>
      <p className="mb-4 text-sm text-surface-500 dark:text-surface-400">
        YouTube URL을 붙여넣어 바로 더빙을 시작하세요
      </p>
      <div className="flex gap-2">
        <Input
          placeholder="https://youtube.com/watch?v=..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          icon={<Play className="h-4 w-4" />}
          className="bg-white dark:bg-surface-900"
        />
        <Button onClick={handleStart} disabled={!isValid} className="shrink-0">
          시작
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  )
}
