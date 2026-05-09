'use client'

import { FileVideo, Languages, FileText, Upload } from 'lucide-react'
import { useLocaleText } from '@/hooks/useLocaleText'

const steps = [
  {
    icon: FileVideo,
    step: '01',
    title: { ko: '영상 넣기', en: 'Add video' },
    description: { ko: 'YouTube 링크를 붙여넣거나 파일을 업로드합니다.', en: 'Paste a YouTube link or upload a file.' },
  },
  {
    icon: Languages,
    step: '02',
    title: { ko: '언어 고르기', en: 'Choose languages' },
    description: { ko: '필요한 언어를 선택하고 제목·설명 기본값을 확인합니다.', en: 'Choose target languages and review title and description defaults.' },
  },
  {
    icon: FileText,
    step: '03',
    title: { ko: '검토 및 수정', en: 'Review and edit' },
    description: { ko: '언어별 더빙, 자막, 제목·설명 결과를 확인합니다.', en: 'Review each dub, caption, title, and description.' },
  },
  {
    icon: Upload,
    step: '04',
    title: { ko: 'YouTube에 게시', en: 'Publish to YouTube' },
    description: { ko: '파일로 받거나 YouTube 업로드까지 이어서 진행합니다.', en: 'Download files or continue directly to YouTube upload.' },
  },
]

export function HowItWorks() {
  const t = useLocaleText()

  return (
    <section id="how-it-works" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="break-keep text-3xl font-bold text-surface-900 dark:text-white sm:text-4xl">
            {t({ ko: '4단계로 다국어 더빙 시작', en: 'Start multilingual dubbing in four steps' })}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-surface-600 dark:text-surface-300">
            {t({ ko: '영상 선택부터 YouTube 업로드까지 같은 흐름으로 진행하세요.', en: 'Move from video selection to YouTube upload in one workflow.' })}
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ icon: Icon, step, title, description }, i) => (
            <div key={step} className="relative text-center">
              {i < steps.length - 1 && (
                <div className="absolute left-[calc(50%+40px)] top-10 hidden h-px w-[calc(100%-80px)] bg-surface-200 dark:bg-surface-800 lg:block" />
              )}
              <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-600 dark:border-brand-900/60 dark:bg-brand-900/20 dark:text-brand-300">
                <Icon className="h-9 w-9" />
                <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-brand-600 shadow-sm dark:bg-surface-800 dark:text-brand-400">
                  {step}
                </span>
              </div>
              <h3 className="break-keep text-xl font-bold text-surface-900 dark:text-white">{t(title)}</h3>
              <p className="mt-3 text-surface-600 dark:text-surface-300">{t(description)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
