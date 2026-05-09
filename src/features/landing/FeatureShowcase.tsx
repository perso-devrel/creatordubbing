import { Mic, Subtitles, Clock, BarChart3 } from 'lucide-react'

const features = [
  {
    icon: Mic,
    title: '보이스 클론',
    description: '여러 언어에서도 원래 목소리의 톤과 분위기를 유지하도록 돕습니다.',
  },
  {
    icon: Subtitles,
    title: '번역 에디터',
    description: '문장 단위로 번역을 검토하고 브랜드명·고유명사를 다듬을 수 있습니다.',
  },
  // Lip sync feature is temporarily hidden from the landing page.
  // {
  //   icon: Wand2,
  //   title: '립싱크',
  //   description: '선택적 AI 립싱크로 실사 영상에 최적화. 입 모양이 더빙 오디오와 완벽하게 맞습니다.',
  // },
  {
    icon: Clock,
    title: '롱폼 지원',
    description: '긴 영상도 진행률을 확인하며 처리할 수 있습니다. 완료된 파일은 결과 화면에서 바로 확인하세요.',
  },
  {
    icon: BarChart3,
    title: '분석 대시보드',
    description: '업로드한 더빙 영상의 성과를 언어별로 확인하고 다음 작업에 참고할 수 있습니다.',
  },
]

export function FeatureShowcase() {
  return (
    <section id="features" className="bg-surface-50 py-24 dark:bg-surface-900/50">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-surface-900 dark:text-white sm:text-4xl">
            다국어 더빙에 필요한 기본 기능
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-surface-500 dark:text-surface-400">
            YouTube 크리에이터를 위해 만든 더빙 제작 도구
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="group rounded-2xl border border-surface-200 bg-white p-6 transition-all hover:border-brand-200 hover:shadow-lg hover:shadow-brand-500/5 dark:border-surface-800 dark:bg-surface-900 dark:hover:border-brand-800"
            >
              <div className="mb-4 inline-flex rounded-xl bg-brand-50 p-3 text-brand-600 transition-colors group-hover:bg-brand-100 dark:bg-brand-900/20 dark:text-brand-400">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-surface-900 dark:text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-surface-500 dark:text-surface-400">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
