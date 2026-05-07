'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Search, X } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { cn } from '@/utils/cn'
import {
  REGION_LABELS,
  SUPPORTED_LANGUAGES,
  getLanguageByCode,
  type LanguageRegion,
} from '@/utils/languages'
import { useDubbingStore } from '../../store/dubbingStore'

type RegionFilter = 'all' | LanguageRegion

const REGION_TABS: { id: RegionFilter; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'popular', label: REGION_LABELS.popular },
  { id: 'asia', label: REGION_LABELS.asia },
  { id: 'europe', label: REGION_LABELS.europe },
  { id: 'middle-east', label: REGION_LABELS['middle-east'] },
]

export function LanguageSelectStep() {
  const {
    selectedLanguages,
    toggleLanguage,
    deliverableMode,
    prevStep,
    nextStep,
  } = useDubbingStore()

  const [region, setRegion] = useState<RegionFilter>('popular')
  const [query, setQuery] = useState('')

  // Lip sync UI is temporarily hidden. Keep the state/reset logic here for easy restore.
  // const lipSyncEnabled = useDubbingStore((s) => s.lipSyncEnabled)
  // const setLipSync = useDubbingStore((s) => s.setLipSync)
  // const lipSyncApplicable = deliverableMode !== 'originalWithMultiAudio'
  // useEffect(() => {
  //   if (!lipSyncApplicable && lipSyncEnabled) setLipSync(false)
  // }, [lipSyncApplicable, lipSyncEnabled, setLipSync])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return SUPPORTED_LANGUAGES.filter((l) => {
      if (q) {
        return (
          l.code.toLowerCase().includes(q) ||
          l.name.toLowerCase().includes(q) ||
          l.nativeName.toLowerCase().includes(q)
        )
      }
      return region === 'all' ? true : l.region === region
    })
  }, [region, query])

  const estimatedCredits = selectedLanguages.length * 15
  // const estimatedCredits = selectedLanguages.length * 15 + (lipSyncEnabled ? selectedLanguages.length * 8 : 0)
  const selectionDescription = deliverableMode === 'originalWithMultiAudio'
    ? '자막을 생성할 언어를 선택하세요'
    : '더빙할 언어를 선택하세요'

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-surface-900 dark:text-white">대상 언어 선택</h2>
        <p className="mt-1 text-surface-500">
          {selectionDescription} ({selectedLanguages.length}개 선택됨)
        </p>
      </div>

      {/* Selected chips */}
      {selectedLanguages.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedLanguages.map((code) => {
            const lang = getLanguageByCode(code)
            if (!lang) return null
            return (
              <button
                key={code}
                onClick={() => toggleLanguage(code)}
                className="inline-flex items-center gap-1.5 rounded-full border border-brand-500 bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700 transition hover:bg-brand-100 dark:bg-brand-900/30 dark:text-brand-200 dark:hover:bg-brand-900/50"
              >
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
                <X className="h-3.5 w-3.5" />
              </button>
            )
          })}
        </div>
      )}

      {/* Search + region tabs */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="언어 검색 (예: Korean, 한국어, ko)"
            className="w-full rounded-md border border-surface-300 bg-white py-2 pl-9 pr-9 text-sm text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-900 dark:text-white"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {!query && (
          <div className="flex flex-wrap gap-2">
            {REGION_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRegion(tab.id)}
                className={cn(
                  'rounded-full px-3 py-1 text-sm font-medium transition',
                  region === tab.id
                    ? 'bg-brand-500 text-white'
                    : 'bg-surface-100 text-surface-700 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Language grid */}
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-surface-500">
          검색 결과가 없습니다
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {filtered.map((lang) => {
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
      )}

      {/* Dub options */}
      <Card>
        {/*
        <p className="mb-3 text-sm font-semibold text-surface-900 dark:text-white">더빙 옵션</p>
        {lipSyncApplicable && (
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
        )}
        */}

        <div className="rounded-lg bg-surface-50 p-3 dark:bg-surface-800">
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
          {deliverableMode === 'downloadOnly' ? '다음: 번역 확인' : '다음: 업로드 설정'}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
