'use client'

import { type FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Play } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { isValidYouTubeUrl } from '@/utils/validators'
import { useLocaleText } from '@/hooks/useLocaleText'

export function HeroUrlInput() {
  const [url, setUrl] = useState('')
  const router = useRouter()
  const isValid = url.length > 0 && isValidYouTubeUrl(url)
  const t = useLocaleText()

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!isValid) return
    router.push(`/dubbing?url=${encodeURIComponent(url)}`)
  }

  return (
    <form className="mt-10 max-w-xl" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-2 rounded-lg border border-surface-200 bg-white p-2 shadow-sm dark:border-surface-800 dark:bg-surface-900 sm:flex-row">
        <Input
          placeholder={t({ ko: 'YouTube 링크를 붙여넣으세요', en: 'Paste a YouTube link' })}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="border-0 shadow-none focus-visible:ring-0"
          icon={<Play className="h-4 w-4" />}
        />
        <Button type="submit" className="shrink-0" disabled={!isValid}>
          {t({ ko: '더빙 시작', en: 'Start dubbing' })}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </form>
  )
}
