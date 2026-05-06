'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/utils/cn'
import { useI18nStore } from '@/stores/i18nStore'
import {
  LayoutDashboard,
  Languages,
  Video,
  CreditCard,
  Layers,
  Settings,
  Upload,
  Globe2,
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', label: { ko: '대시보드', en: 'Dashboard' }, icon: LayoutDashboard },
  { to: '/dubbing', label: { ko: '새 더빙', en: 'New dubbing' }, icon: Languages },
  { to: '/metadata', label: { ko: '메타데이터 번역', en: 'Metadata' }, icon: Globe2 },
  { to: '/batch', label: { ko: '배치 큐', en: 'Batch queue' }, icon: Layers },
  { to: '/uploads', label: { ko: 'YouTube 업로드', en: 'YouTube uploads' }, icon: Upload },
  { to: '/youtube', label: { ko: 'YouTube', en: 'YouTube' }, icon: Video },
  { to: '/billing', label: { ko: '결제', en: 'Billing' }, icon: CreditCard },
]

export function Sidebar() {
  const pathname = usePathname()
  const appLocale = useI18nStore((state) => state.appLocale)

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900">
      <div className="flex h-16 items-center gap-2.5 border-b border-surface-200 px-6 dark:border-surface-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-brand-500">
          <Languages className="h-4.5 w-4.5 text-white" />
        </div>
        <span className="text-lg font-bold text-surface-900 dark:text-surface-100">
          Dub<span className="text-brand-500">tube</span>
        </span>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map(({ to, label, icon: Icon }) => {
          const isActive = pathname === to || pathname?.startsWith(to + '/')
          return (
            <Link
              key={to}
              href={to}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400'
                  : 'text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800',
              )}
            >
              <Icon className="h-5 w-5" />
              {label[appLocale]}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-surface-200 p-3 dark:border-surface-800">
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800"
        >
          <Settings className="h-5 w-5" />
          {appLocale === 'en' ? 'Settings' : '설정'}
        </Link>
      </div>
    </aside>
  )
}
