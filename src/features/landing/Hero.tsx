import { Globe, Puzzle, Shield, Zap } from 'lucide-react'
import { HeroUrlInput } from './HeroUrlInput'
import { SUPPORTED_LANGUAGE_COUNT } from '@/utils/languages'

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-white to-pink-50 dark:from-surface-950 dark:via-surface-950 dark:to-brand-950/20" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(244,63,94,0.08),transparent_50%)]" />

      <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-20 lg:pt-28">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700 dark:border-brand-800 dark:bg-brand-900/20 dark:text-brand-400">
            <Zap className="h-3.5 w-3.5" />
            YouTube 크리에이터를 위한 AI 더빙
          </div>

          <h1 className="text-5xl font-extrabold tracking-tight text-surface-900 dark:text-white sm:text-6xl lg:text-7xl">
            영상 하나로{' '}
            <span className="bg-gradient-to-r from-brand-600 to-pink-500 bg-clip-text text-transparent">
              {SUPPORTED_LANGUAGE_COUNT}개 언어 더빙
            </span>
            <br />
            전 세계 시청자에게 전하세요
          </h1>

          <p className="mx-auto mt-6 text-lg text-surface-600 break-keep dark:text-surface-400 sm:text-xl">
            <span className="block lg:whitespace-nowrap">
              영상을 올리고 언어를 선택하면 {SUPPORTED_LANGUAGE_COUNT}개 언어 더빙을 만들 수 있습니다.
            </span>
            <span className="block lg:whitespace-nowrap">
              원래 목소리의 톤을 살려 더 많은 시청자에게 콘텐츠를 전하세요.
            </span>
          </p>

          <HeroUrlInput />

          <div className="mt-16 grid grid-cols-3 gap-8 border-t border-surface-200 pt-10 dark:border-surface-800">
            {[
              { icon: Globe, label: `${SUPPORTED_LANGUAGE_COUNT}개 언어`, desc: '지원' },
              { icon: Puzzle, label: 'YouTube 업로드', desc: '연동 지원' },
              { icon: Shield, label: '보이스 클론', desc: '톤 유지' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <Icon className="h-6 w-6 text-brand-500" />
                <div className="whitespace-nowrap text-xl font-bold text-surface-900 dark:text-white">{label}</div>
                <div className="text-sm font-medium text-surface-700 dark:text-surface-300">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
