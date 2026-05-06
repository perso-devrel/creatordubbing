import { MetadataLocalizationTool } from '@/features/metadata/components/MetadataLocalizationTool'

export default function MetadataPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">메타데이터 번역</h1>
        <p className="text-surface-500 dark:text-surface-400">
          더빙이나 자막 없이 YouTube 제목·설명 번역만 생성하고 적용합니다.
        </p>
      </div>

      <MetadataLocalizationTool />
    </div>
  )
}
