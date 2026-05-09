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
              전 세계 시청자를 만날 준비가 되셨나요?
            </h2>
            <p className="mx-auto mt-4 text-lg text-white/80 break-keep sm:whitespace-nowrap">
              영상을 여러 언어로 더빙하고 YouTube 업로드까지 한 흐름으로 진행하세요.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/dashboard">
                <Button size="lg" className="bg-white text-brand-600 shadow-lg hover:bg-surface-50">
                  지금 시작하기
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <a href="#pricing">
                <Button
                  variant="ghost"
                  size="lg"
                  className="border-2 border-white/80 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 hover:border-white"
                >
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
