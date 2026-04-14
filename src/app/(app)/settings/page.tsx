import { Card, CardTitle } from '@/components/ui'
import { Settings } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">설정</h1>
        <p className="text-surface-500 dark:text-surface-400">계정 및 앱 설정을 관리하세요</p>
      </div>

      <Card>
        <div className="flex items-center gap-3 py-8 text-surface-400">
          <Settings className="h-5 w-5" />
          <CardTitle>준비 중</CardTitle>
        </div>
      </Card>
    </div>
  )
}
