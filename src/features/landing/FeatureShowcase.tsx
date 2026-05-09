'use client'

import { Mic, Subtitles, Clock, BarChart3 } from 'lucide-react'
import { useLocaleText } from '@/hooks/useLocaleText'

const features = [
  {
    icon: Mic,
    title: { ko: '원본 톤에 가까운 더빙', en: 'Dubs close to the original tone' },
    description: { ko: '언어가 달라져도 원본 목소리의 분위기를 최대한 유지하도록 더빙을 생성합니다.', en: 'Generate dubs that preserve the feel of the original voice across languages.' },
  },
  {
    icon: Subtitles,
    title: { ko: '제목·설명 현지화', en: 'Localized titles and descriptions' },
    description: { ko: '더빙 결과와 함께 YouTube 제목, 설명, 자막을 언어별로 준비합니다.', en: 'Prepare YouTube titles, descriptions, and captions for each language.' },
  },
  // Lip sync feature is temporarily hidden from the landing page.
  // {
  //   icon: Wand2,
  //   title: '립싱크',
  //   description: '선택적 AI 립싱크로 실사 영상에 최적화. 입 모양이 더빙 오디오와 완벽하게 맞습니다.',
  // },
  {
    icon: Clock,
    title: { ko: '완료 파일 관리', en: 'Manage completed files' },
    description: { ko: '진행률과 완료 상태를 보고, 완료된 파일은 결과 화면에서 바로 확인합니다.', en: 'Track progress and open completed files from the results screen.' },
  },
  {
    icon: BarChart3,
    title: { ko: '언어별 성과 확인', en: 'Performance by language' },
    description: { ko: '업로드한 더빙 영상의 성과를 언어별로 확인하고 다음 작업에 참고합니다.', en: 'Review how each uploaded dub performs and use it for the next upload.' },
  },
]

export function FeatureShowcase() {
  const t = useLocaleText()

  return (
    <section id="features" className="border-y border-surface-200/70 bg-white py-24 dark:border-surface-800 dark:bg-surface-950">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-surface-900 dark:text-white sm:text-4xl">
            {t({ ko: '더빙부터 게시 준비까지 한 흐름으로', en: 'One workflow from dubbing to publishing' })}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-surface-600 dark:text-surface-300">
            {t({ ko: '새 영상을 만들 때 필요한 더빙, 자막, 제목·설명 작업을 한곳에서 정리합니다.', en: 'Organize dubbing, captions, titles, and descriptions in one place before you publish.' })}
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title.ko}
              className="group rounded-lg border border-surface-200 bg-white p-6 shadow-sm transition-colors hover:border-brand-300 dark:border-surface-800 dark:bg-surface-900 dark:hover:border-brand-700"
            >
              <div className="mb-4 inline-flex rounded-lg bg-brand-50 p-3 text-brand-600 transition-colors group-hover:bg-brand-100 dark:bg-brand-900/20 dark:text-brand-400">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="break-keep text-lg font-semibold text-surface-900 dark:text-white">{t(title)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-surface-600 dark:text-surface-300">{t(description)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
