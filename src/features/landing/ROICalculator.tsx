'use client'

import { useState } from 'react'
import { TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui'
import { formatNumber } from '@/utils/formatters'

const BASE_VIEWS = 100000

// 언어별 추가 조회수 기여율 (원본 조회수 대비).
// 앵커 데이터:
//  - YouTube 공식 (blog.youtube, 2023): 멀티오디오 적용 영상 평균 시청시간의 25%+ 가 비주력 언어
//    → 원본 대비 약 +33% 추가 도달
//  - Jamie Oliver: 멀티오디오로 조회수 3배 (+200%)
//  - AIR Media-Tech: 채널 간 오디오 교차 적용 시 +45%
//  - 국제 구독자 평균 +40%
// 위 매크로 데이터를 언어별로 분배한 추정치로, 화자 규모·YouTube 시장 점유율·시청 시간 비중을
// 반영해 도달률 내림차순 정렬했다. 단순 누적합 = 단조 증가 + 자연스러운 한계효용 감소.
// 정확한 채널별 측정값이 아니므로 UI에서 반드시 추정치임을 명시할 것.
const LANGUAGE_LIFT_RATES = [
  0.30, // 스페인어 (LATAM + 스페인, 공개 사례 중 가장 큰 단일 언어 효과)
  0.22, // 힌디어 (인도, YouTube 1위 시장)
  0.18, // 포르투갈어 (브라질, YouTube 상위 시장)
  0.14, // 아랍어 (MENA 권역)
  0.12, // 인도네시아어
  0.10, // 프랑스어 (프랑스 + 아프리카 프랑코폰)
  0.09, // 일본어
  0.08, // 독일어
  0.06, // 한국어
  0.04, // 중국어 (YouTube 접근성 제한)
]

export function ROICalculator() {
  const [selectedCount, setSelectedCount] = useState(5)

  const lift = LANGUAGE_LIFT_RATES.slice(0, selectedCount).reduce((a, b) => a + b, 0)
  const growthPct = Math.round(lift * 100)
  const projectedViews = Math.round(BASE_VIEWS * (1 + lift))

  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-surface-900 dark:text-white sm:text-4xl">
            예상 도달 범위 계산기
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-surface-500 dark:text-surface-400">
            공개 사례와 업계 데이터를 바탕으로 한 참고용 추정치입니다.
            <br className="hidden sm:block" />
            실제 성과는 콘텐츠·썸네일·업로드 빈도·채널 규모에 따라 크게 달라집니다.
          </p>
        </div>

        <Card className="mx-auto mt-12 max-w-2xl">
          <div className="space-y-8">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <label htmlFor="roi-langs" className="text-sm font-medium text-surface-700 dark:text-surface-300">
                  더빙 언어 수
                </label>
                <span className="text-lg font-bold text-surface-900 dark:text-white">{selectedCount}개</span>
              </div>
              <input
                id="roi-langs"
                type="range"
                min={1}
                max={10}
                value={selectedCount}
                onChange={(e) => setSelectedCount(Number(e.target.value))}
                aria-label="더빙 언어 수"
                className="w-full accent-brand-500"
              />
              <div className="mt-1 flex justify-between text-xs text-surface-400"><span>1</span><span>10</span></div>
            </div>

            <div className="rounded-xl bg-gradient-to-r from-brand-50 to-pink-50 p-6 dark:from-brand-900/20 dark:to-pink-900/20">
              <div className="flex items-center gap-2 text-sm font-medium text-brand-700 dark:text-brand-400">
                <TrendingUp className="h-4 w-4" />
                참고용 예상 증가율
              </div>
              <div className="mt-2 text-5xl font-extrabold text-surface-900 dark:text-white">
                최대 +{growthPct}% 예상
              </div>
              <div className="mt-3 text-sm text-surface-600 dark:text-surface-400">
                월 조회수 <span className="font-semibold">{formatNumber(BASE_VIEWS)}회</span> 기준{' '}
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatNumber(projectedViews)}회</span>까지 도달 가능
              </div>
              <p className="mt-3 text-xs text-surface-500 dark:text-surface-400">
                공개 사례를 언어별로 분배한 참고 추정치입니다. 채널별 실측치나 성과 보장이 아닙니다.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </section>
  )
}
