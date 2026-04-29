'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Play } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { isValidYouTubeUrl } from '@/utils/validators'

export function HeroUrlInput() {
  const [url, setUrl] = useState('')
  const isValid = url.length > 0 && isValidYouTubeUrl(url)

  return (
    <div className="mx-auto mt-10 max-w-xl">
      <div className="flex gap-2 rounded-xl border border-surface-200 bg-white p-2 shadow-lg dark:border-surface-800 dark:bg-surface-900">
        <Input
          placeholder="YouTube URL을 붙여넣으세요..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="border-0 shadow-none focus-visible:ring-0"
          icon={<Play className="h-4 w-4" />}
        />
        <Link href="/dubbing">
          <Button className="shrink-0 whitespace-nowrap" disabled={!isValid}>
            더빙 시작
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
