'use client'

import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { Button, Card, Toggle, Tooltip } from '@/components/ui'
import { cn } from '@/utils/cn'
import { SUPPORTED_LANGUAGES } from '@/utils/languages'
import { useDubbingStore } from '../../store/dubbingStore'

export function LanguageSelectStep() {
  const { selectedLanguages, toggleLanguage, lipSyncEnabled, setLipSync, prevStep, nextStep } = useDubbingStore()

  const estimatedCredits = selectedLanguages.length * 15 + (lipSyncEnabled ? selectedLanguages.length * 8 : 0)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-surface-900 dark:text-white">대상 언어 선택</h2>
        <p className="mt-1 text-surface-500">
          더빙할 언어를 최대 10개까지 선택하세요 ({selectedLanguages.length}/10 선택됨)
        </p>
      </div>

      {/* Language grid — exclude source language (ko for test video) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {SUPPORTED_LANGUAGES.filter((l) => l.code !== 'ko').map((lang) => {
          const isSelected = selectedLanguages.includes(lang.code)
          return (
            <button
              key={lang.code}
              onClick={() => toggleLanguage(lang.code)}
              className={cn(
                'relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all cursor-pointer',
                isSelected
                  ? 'border-brand-500 bg-brand-50 shadow-md shadow-brand-500/10 dark:bg-brand-900/20'
                  : 'border-surface-200 bg-white hover:border-surface-300 dark:border-surface-800 dark:bg-surface-900 dark:hover:border-surface-700',
              )}
            >
              {isSelected && (
                <div className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-white">
                  <Check className="h-3 w-3" />
                </div>
              )}
              <span className="text-2xl">{lang.flag}</span>
              <span className="text-sm font-medium text-surface-900 dark:text-white">{lang.name}</span>
              <span className="text-xs text-surface-400">{lang.nativeName}</span>
            </button>
          )
        })}
      </div>

      {/* Options */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-surface-900 dark:text-white">립싱크</span>
              <Tooltip content="AI가 더빙 오디오에 맞춰 입 모양을 조절합니다. 실사 영상에 최적화.">
                <span className="cursor-help text-xs text-surface-400">(?)</span>
              </Tooltip>
            </div>
            <p className="text-xs text-surface-500 mt-0.5">언어당 크레딧 50% 추가</p>
          </div>
          <Toggle checked={lipSyncEnabled} onChange={setLipSync} />
        </div>

        <div className="mt-4 rounded-lg bg-surface-50 p-3 dark:bg-surface-800">
          <div className="flex items-center justify-between text-sm">
            <span className="text-surface-600 dark:text-surface-400">예상 크레딧</span>
            <span className="font-bold text-surface-900 dark:text-white">{estimatedCredits} 크레딧</span>
          </div>
        </div>
      </Card>

      <div className="flex justify-between">
        <Button variant="secondary" onClick={prevStep}>
          <ArrowLeft className="h-4 w-4" />
          이전
        </Button>
        <Button onClick={nextStep} disabled={selectedLanguages.length === 0}>
          다음: 설정 확인
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
