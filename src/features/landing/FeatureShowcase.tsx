import { Mic, Subtitles, Clock, BarChart3, Users, Wand2 } from 'lucide-react'

const features = [
  {
    icon: Mic,
    title: '보이스 클론',
    description: '모든 더빙 언어에서 내 고유한 목소리를 유지합니다. 시청자는 내 목소리로 듣게 됩니다.',
  },
  {
    icon: Subtitles,
    title: '번역 에디터',
    description: '문장 단위로 번역을 검토하고 수정할 수 있습니다. 브랜드명, 고유명사 보호 기능.',
  },
  {
    icon: Wand2,
    title: '립싱크',
    description: '선택적 AI 립싱크로 실사 영상에 최적화. 입 모양이 더빙 오디오와 완벽하게 맞습니다.',
  },
  {
    icon: Clock,
    title: '15분 롱폼 지원',
    description: '긴 영상도 실시간 진행률 추적으로 처리. 완료되면 알림을 받으세요.',
  },
  {
    icon: BarChart3,
    title: '분석 대시보드',
    description: '어떤 더빙 언어가 가장 효과적인지 데이터로 확인. 글로벌 콘텐츠 전략 최적화.',
  },
  {
    icon: Users,
    title: '배치 처리',
    description: '여러 영상을 한 번에 큐에 넣고 우선순위 설정. 시스템이 자동으로 처리합니다.',
  },
]

export function FeatureShowcase() {
  return (
    <section id="features" className="bg-surface-50 py-24 dark:bg-surface-900/50">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-surface-900 dark:text-white sm:text-4xl">
            글로벌 진출에 필요한 모든 것
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-surface-500 dark:text-surface-400">
            YouTube 크리에이터를 위해 만든 프로 더빙 도구
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
