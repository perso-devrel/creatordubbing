'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui'
import { useLocaleText } from '@/hooks/useLocaleText'

export function CTASection() {
  const t = useLocaleText()

  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="rounded-xl border border-surface-800 bg-surface-950 p-12 text-center shadow-xl shadow-surface-900/10 dark:border-surface-700 dark:bg-surface-900 sm:p-16">
          <div>
            <h2 className="break-keep text-3xl font-extrabold text-white sm:text-4xl">
              {t({ ko: '다음 영상은 여러 언어로 준비하세요', en: 'Prepare your next video in more languages' })}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-surface-200">
              {t({ ko: '더빙 결과를 확인하고, 자막과 제목·설명까지 정리한 뒤 YouTube 업로드로 이어가세요.', en: 'Review the dubbed results, prepare captions, titles, and descriptions, then continue to YouTube upload.' })}
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/dashboard">
                <Button size="lg" className="bg-white text-surface-950 shadow-sm hover:bg-surface-100">
                  {t({ ko: '새 더빙 시작하기', en: 'Start a new dub' })}
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <a href="#pricing">
                <Button
                  variant="ghost"
                  size="lg"
                  className="border-2 border-white/80 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 hover:border-white"
                >
                  {t({ ko: '요금제 보기', en: 'View pricing' })}
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
