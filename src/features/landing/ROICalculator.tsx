'use client'

import { useState } from 'react'
import { TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui'
import { formatNumber } from '@/utils/formatters'

const LANGUAGE_MULTIPLIERS: Record<string, number> = {
  '스페인어': 1.8, '힌디어': 2.2, '포르투갈어': 1.5, '일본어': 1.3, '한국어': 1.4,
  '프랑스어': 1.2, '독일어': 1.1, '아랍어': 1.6, '인도네시아어': 1.7, '중국어': 2.0,
}

export function ROICalculator() {
  const [monthlyViews, setMonthlyViews] = useState(50000)
  const [selectedCount, setSelectedCount] = useState(5)

  const avgMultiplier =
    Object.values(LANGUAGE_MULTIPLIERS)
      .slice(0, selectedCount)
      .reduce((a, b) => a + b, 0) / Math.max(selectedCount, 1)

  const projectedViews = Math.round(monthlyViews * (1 + avgMultiplier * selectedCount * 0.12))
  const growthPct = Math.round(((projectedViews - monthlyViews) / monthlyViews) * 100)

  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-surface-900 dark:text-white sm:text-4xl">
            성장 가능성 계산기
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-surface-500 dark:text-surface-400">
            다국어 더빙으로 얼마나 성장할 수 있는지 확인해보세요
          </p>
        </div>

        <Card className="mx-auto mt-12 max-w-2xl">
          <div className="space-y-8">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <label htmlFor="roi-views" className="text-sm font-medium text-surface-700 dark:text-surface-300">
                  현재 월간 조회수
                </label>
                <span className="text-lg font-bold text-surface-900 dark:text-white">
                  {formatNumber(monthlyViews)}
                </span>
              </div>
              <input
                id="roi-views"
                type="range"
                min={1000}
                max={1000000}
                step={1000}
                value={monthlyViews}
                onChange={(e) => setMonthlyViews(Number(e.target.value))}
                aria-label="현재 월간 조회수"
                className="w-full accent-brand-500"
              />
              <div className="mt-1 flex justify-between text-xs text-surface-400"><span>1K</span><span>1M</span></div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <label htmlFor="roi-langs" className="text-sm font-medium text-surface-700 dark:text-surface-300">언어 수</label>
                <span className="text-lg font-bold text-surface-900 dark:text-white">{selectedCount}</span>
              </div>
              <input
                id="roi-langs"
                type="range"
                min={1}
                max={10}
                value={selectedCount}
                onChange={(e) => setSelectedCount(Number(e.target.value))}
                aria-label="언어 수"
                className="w-full accent-brand-500"
              />
              <div className="mt-1 flex justify-between text-xs text-surface-400"><span>1</span><span>10</span></div>
            </div>

            <div className="rounded-xl bg-gradient-to-r from-brand-50 to-pink-50 p-6 dark:from-brand-900/20 dark:to-pink-900/20">
              <div className="flex items-center gap-2 text-sm font-medium text-brand-700 dark:text-brand-400">
                <TrendingUp className="h-4 w-4" />
                예상 월간 조회수
              </div>
              <div className="mt-2 text-3xl font-extrabold text-surface-900 dark:text-white">
                {formatNumber(projectedViews)}
              </div>
              <div className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">
                +{growthPct}% 예상 성장률
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  )
}
