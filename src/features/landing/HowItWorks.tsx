import { FileVideo, Languages, FileText, Upload } from 'lucide-react'

const steps = [
  {
    icon: FileVideo,
    step: '01',
    title: '영상 넣기',
    description: 'YouTube 링크를 붙여넣거나 파일을 업로드합니다.',
  },
  {
    icon: Languages,
    step: '02',
    title: '언어 고르기',
    description: '필요한 언어를 선택하고 제목·설명 기본값을 확인합니다.',
  },
  {
    icon: FileText,
    step: '03',
    title: '결과 확인',
    description: '언어별 더빙, 자막, 메타데이터 결과를 검토합니다.',
  },
  {
    icon: Upload,
    step: '04',
    title: 'YouTube에 게시',
    description: '다운로드하거나 YouTube 업로드까지 이어서 진행합니다.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-surface-900 dark:text-white sm:text-4xl">
            4단계로 게시 준비
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-surface-500 dark:text-surface-400">
            영상 선택부터 결과 확인, YouTube 업로드까지 같은 흐름으로 진행합니다.
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
              <h3 className="text-xl font-bold text-surface-900 dark:text-white">{title}</h3>
              <p className="mt-3 text-surface-500 dark:text-surface-400">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
