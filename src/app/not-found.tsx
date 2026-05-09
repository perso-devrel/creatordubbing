'use client'

import Link from 'next/link'
import { Button } from '@/components/ui'
import { useLocaleText } from '@/hooks/useLocaleText'

export default function NotFoundPage() {
  const t = useLocaleText()

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-brand-500">404</h1>
        <p className="mt-2 text-lg text-surface-600 dark:text-surface-400">{t({ ko: '페이지를 찾을 수 없습니다', en: 'Page not found' })}</p>
        <Link href="/" className="mt-6 inline-block">
          <Button>{t({ ko: '홈으로', en: 'Go home' })}</Button>
        </Link>
      </div>
    </div>
  )
}
