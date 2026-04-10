import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui'

export function CTASection() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-500 to-pink-500 p-12 text-center shadow-2xl shadow-brand-500/25 sm:p-16">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(255,255,255,0.1),transparent_50%)]" />
          <div className="relative">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              전 세계를 만날 준비 되셨나요?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
              AI 더빙으로 글로벌 시청자를 확보하고 있는 수천 명의 크리에이터와 함께하세요.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/dashboard">
                <Button size="lg" className="bg-white text-brand-600 shadow-lg hover:bg-surface-50">
                  무료 체험 시작
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <a href="#pricing">
                <Button variant="ghost" size="lg" className="text-white hover:bg-white/10">
                  요금제 보기
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
