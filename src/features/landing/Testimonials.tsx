import { Star } from 'lucide-react'

const testimonials = [
  {
    name: 'Sarah Chen',
    role: '테크 유튜버, 구독자 240만',
    avatar: 'SC',
    quote: 'Dubtube로 3개월 만에 해외 시청자가 340% 성장했어요. 보이스 클론이 너무 자연스러워서 스페인어 시청자들이 제가 직접 스페인어를 배운 줄 알았대요!',
    rating: 5,
  },
  {
    name: '박민재',
    role: 'K-콘텐츠 크리에이터, 구독자 89만',
    avatar: '박',
    quote: '영상 하나당 번역 에이전시에 50만원씩 쓰던 게 이제는 훨씬 적은 비용으로 8개 언어 더빙이 가능해졌어요. 품질도 더 좋고요.',
    rating: 5,
  },
  {
    name: 'Alex Rivera',
    role: '교육 크리에이터, 구독자 110만',
    avatar: 'AR',
    quote: '번역 에디터가 정말 강력해요. 더빙 전에 문장 하나하나 수정할 수 있어서 교육 콘텐츠의 정확성을 보장할 수 있습니다.',
    rating: 5,
  },
]

export function Testimonials() {
  return (
    <section className="bg-surface-50 py-24 dark:bg-surface-900/50">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-surface-900 dark:text-white sm:text-4xl">
            전 세계 크리에이터가 사랑하는 서비스
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-surface-500 dark:text-surface-400">
            수천 명의 크리에이터와 함께 글로벌 시청자를 만나세요
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.name} className="rounded-2xl border border-surface-200 bg-white p-6 dark:border-surface-800 dark:bg-surface-900">
              <div className="mb-4 flex gap-0.5">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-surface-700 dark:text-surface-300 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-600 text-sm font-bold text-white">
                  {t.avatar}
                </div>
                <div>
                  <div className="text-sm font-semibold text-surface-900 dark:text-white">{t.name}</div>
                  <div className="text-xs text-surface-500">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
