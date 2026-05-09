'use client'

import { CheckCircle2, Globe, Languages, PlayCircle, UploadCloud } from 'lucide-react'
import { HeroUrlInput } from './HeroUrlInput'
import { SUPPORTED_LANGUAGE_COUNT } from '@/utils/languages'
import { useLocaleText } from '@/hooks/useLocaleText'

export function Hero() {
  const t = useLocaleText()

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#f7f8fa_100%)] dark:bg-[linear-gradient(180deg,#0f1115_0%,#171a21_100%)]" />

      <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-20 lg:pt-28">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_480px]">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-4 py-1.5 text-sm font-medium text-brand-700 shadow-sm dark:border-brand-900/60 dark:bg-surface-900 dark:text-brand-300">
              <Languages className="h-3.5 w-3.5" />
              {t({ ko: 'YouTube 영상 현지화', en: 'YouTube video localization' })}
            </div>

            <h1 className="max-w-3xl break-keep text-5xl font-extrabold leading-[1.1] text-surface-950 dark:text-white sm:text-6xl lg:text-7xl">
              {t({ ko: '영상 하나로 여러 언어 더빙 만들기', en: 'Create multilingual dubs from one video' })}
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-surface-600 dark:text-surface-300 sm:text-xl">
              {t({
                ko: 'YouTube 링크나 파일을 넣고, 필요한 언어를 고르면 더빙 영상과 제목·설명을 함께 준비합니다. 목소리 톤은 살리고, 게시 전 결과를 확인할 수 있습니다.',
                en: 'Add a YouTube link or file, choose languages, then prepare dubbed videos with localized titles and descriptions. Keep the original tone and review everything before publishing.',
              })}
            </p>

            <HeroUrlInput />

            <div className="mt-10 grid max-w-2xl gap-4 sm:grid-cols-3">
              {[
                {
                  icon: Globe,
                  label: t({ ko: `지원 언어 ${SUPPORTED_LANGUAGE_COUNT}개`, en: `${SUPPORTED_LANGUAGE_COUNT} supported languages` }),
                  desc: t({ ko: '더빙·자막·메타데이터', en: 'Dubs, captions, metadata' }),
                },
                {
                  icon: UploadCloud,
                  label: t({ ko: 'YouTube 업로드 연동', en: 'YouTube upload support' }),
                  desc: t({ ko: '공개 범위와 고지 확인', en: 'Privacy and disclosure checks' }),
                },
                {
                  icon: CheckCircle2,
                  label: t({ ko: '검수 후 게시', en: 'Review before publishing' }),
                  desc: t({ ko: '언어별 결과 확인', en: 'Check each language result' }),
                },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="rounded-lg border border-surface-200 bg-white p-4 shadow-sm dark:border-surface-800 dark:bg-surface-900">
                  <Icon className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                  <div className="mt-3 text-sm font-semibold text-surface-950 dark:text-white">{label}</div>
                  <div className="mt-1 text-xs leading-5 text-surface-600 dark:text-surface-400">{desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-surface-200 bg-white p-5 shadow-xl shadow-surface-200/60 dark:border-surface-800 dark:bg-surface-900 dark:shadow-black/20">
            <div className="flex items-center justify-between border-b border-surface-200 pb-4 dark:border-surface-800">
              <div>
                <p className="text-sm font-semibold text-surface-950 dark:text-white">{t({ ko: '현지화 작업', en: 'Localization job' })}</p>
                <p className="mt-1 text-xs text-surface-600 dark:text-surface-400">{t({ ko: 'YouTube 영상 · 08:42', en: 'YouTube video · 08:42' })}</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                {t({ ko: '준비 완료', en: 'Ready' })}
              </span>
            </div>

            <div className="mt-5 space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-surface-200 p-3 dark:border-surface-800">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
                  <PlayCircle className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-surface-950 dark:text-white">{t({ ko: '원본 영상 가져오기', en: 'Import source video' })}</p>
                  <p className="text-xs text-surface-600 dark:text-surface-400">{t({ ko: 'YouTube 링크 또는 파일 업로드', en: 'YouTube link or file upload' })}</p>
                </div>
              </div>

              {[
                [t({ ko: '스페인어', en: 'Spanish' }), t({ ko: '더빙 영상, 자막, 제목 번역', en: 'Dubbed video, captions, title translation' })],
                [t({ ko: '일본어', en: 'Japanese' }), t({ ko: '더빙 영상, 자막, 제목 번역', en: 'Dubbed video, captions, title translation' })],
                [t({ ko: '영어', en: 'English' }), t({ ko: '더빙 영상, 자막, 제목 번역', en: 'Dubbed video, captions, title translation' })],
              ].map(([lang, detail]) => (
                <div key={lang} className="flex items-center justify-between rounded-lg border border-surface-200 bg-surface-100/70 px-3 py-2.5 dark:border-surface-700 dark:bg-surface-850">
                  <div>
                    <p className="text-sm font-medium text-surface-900 dark:text-surface-100">{lang}</p>
                    <p className="text-xs text-surface-600 dark:text-surface-300">{detail}</p>
                  </div>
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">{t({ ko: '완료', en: 'Done' })}</span>
                </div>
              ))}

              <div className="rounded-lg bg-surface-950 p-4 text-white dark:bg-black">
                <p className="text-sm font-semibold">{t({ ko: 'YouTube 업로드 설정', en: 'YouTube upload settings' })}</p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-surface-300">
                  <span>{t({ ko: '공개 범위: 비공개', en: 'Visibility: Private' })}</span>
                  <span>{t({ ko: 'AI 음성 표시: 켜짐', en: 'AI voice: On' })}</span>
                  <span>{t({ ko: '자막 업로드: 켜짐', en: 'Captions: On' })}</span>
                  <span>{t({ ko: '원본 링크: 추가', en: 'Source link: Added' })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
