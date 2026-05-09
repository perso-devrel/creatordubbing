import { FileVideo, Languages, FileText, Upload } from 'lucide-react'

const steps = [
  {
    icon: FileVideo,
    step: '01',
    title: '동영상 선택',
    description: 'YouTube URL 붙여넣기, 내 채널 영상 불러오기, 직접 업로드 중 원하는 방식을 고르세요.',
  },
  {
    icon: Languages,
    step: '02',
    title: '언어 & 보이스 설정',
    description: '지원 언어 중 원하는 대상을 고르고, 보이스 클론 사용 여부를 선택하세요.',
  },
  {
    icon: FileText,
    step: '03',
    title: '번역 검토 & 편집',
    description: '생성된 번역과 자막을 확인하고 필요한 문장을 수정하세요.',
  },
  {
    icon: Upload,
    step: '04',
    title: '더빙 생성 & 업로드',
    description: '더빙이 완료되면 파일로 다운로드하거나 YouTube 채널에 업로드하세요.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-surface-900 dark:text-white sm:text-4xl">
            4단계로 글로벌 진출
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-surface-500 dark:text-surface-400">
            동영상 선택부터 다국어 업로드까지, 한 흐름으로
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ icon: Icon, step, title, description }, i) => (
            <div key={step} className="relative text-center">
              {i < steps.length - 1 && (
                <div className="absolute left-[calc(50%+40px)] top-10 hidden h-0.5 w-[calc(100%-80px)] bg-gradient-to-r from-brand-300 to-brand-100 dark:from-brand-700 dark:to-brand-900 lg:block" />
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
