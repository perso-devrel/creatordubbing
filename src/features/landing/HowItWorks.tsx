import { Link2, Languages, Upload } from 'lucide-react'

const steps = [
  {
    icon: Link2,
    step: '01',
    title: 'URL 붙여넣기',
    description: 'YouTube 영상 URL을 붙여넣거나 영상 파일을 업로드하세요. 자동으로 오디오 추출, 언어 감지, 전사가 진행됩니다.',
  },
  {
    icon: Languages,
    step: '02',
    title: '언어 선택',
    description: '최대 10개 대상 언어를 선택하세요. 번역 수정, 고유명사 보호, 처리 전 미리보기가 가능합니다.',
  },
  {
    icon: Upload,
    step: '03',
    title: '더빙 & 업로드',
    description: 'AI가 보이스 클론으로 자연스러운 더빙을 생성합니다. 파일 다운로드 또는 YouTube에 바로 업로드하세요.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-surface-900 dark:text-white sm:text-4xl">
            3단계로 글로벌 진출
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-surface-500 dark:text-surface-400">
            URL에서 더빙 영상까지, 몇 분이면 끝
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map(({ icon: Icon, step, title, description }, i) => (
            <div key={step} className="relative text-center">
              {i < steps.length - 1 && (
                <div className="absolute left-[calc(50%+40px)] top-10 hidden h-0.5 w-[calc(100%-80px)] bg-gradient-to-r from-brand-300 to-brand-100 dark:from-brand-700 dark:to-brand-900 md:block" />
              )}
              <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 shadow-lg shadow-brand-500/25">
                <Icon className="h-9 w-9 text-white" />
                <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-brand-600 shadow dark:bg-surface-800 dark:text-brand-400">
                  {step}
                </span>
              </div>
              <h3 className="text-xl font-bold text-surface-900 dark:text-white">{title}</h3>
              <p className="mt-3 text-surface-500 dark:text-surface-400">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
