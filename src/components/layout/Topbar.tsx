'use client'

import Image from 'next/image'
import { LogOut } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { signOut } from '@/lib/google-auth'
import { Button } from '@/components/ui'
import { OpsAlertButton } from '@/features/ops/components/OpsAlertButton'
import { useChannelStats } from '@/hooks/useYouTubeData'
import { AppLocaleSelect } from '@/components/layout/AppLocaleSelect'
import { useAppLocale, useLocaleText } from '@/hooks/useLocaleText'
import { useLocaleRouter } from '@/hooks/useLocalePath'
import { useOperationsAccess } from '@/features/ops/hooks/useOperationsAccess'

interface TopbarProps {
  isOpsAdmin?: boolean
}

export function Topbar({ isOpsAdmin = false }: TopbarProps = {}) {
  const { user, clear } = useAuthStore()
  const router = useLocaleRouter()
  const { data: channel } = useChannelStats()
  const opsAccess = useOperationsAccess()
  const locale = useAppLocale()
  const t = useLocaleText()
  const canViewOps = isOpsAdmin || opsAccess.data?.isOpsAdmin === true
  const accountName = channel?.title || user?.displayName || t('components.layout.topbar.user')
  const subscriberLabel = channel
    ? t('components.layout.topbar.subscriberCount', {
      count: channel.subscriberCount.toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US'),
    })
    : null

  const handleSignOut = async () => {
    signOut()
    clear()
    await fetch('/api/auth/signout', { method: 'POST' }).catch(() => {})
    router.push('/')
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-surface-200 bg-white/80 px-6 backdrop-blur-md dark:border-surface-800 dark:bg-surface-900/80">
      <div />

      <div className="flex items-center gap-2">
        <AppLocaleSelect className="w-28 sm:w-32" />
        {canViewOps && <OpsAlertButton />}

        {user && (
          <div className="ml-2 flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="max-w-48 truncate text-sm font-medium leading-snug text-surface-900 dark:text-white">
                {accountName}
              </p>
              {subscriberLabel && (
                <p className="whitespace-nowrap text-xs leading-snug text-surface-600 dark:text-surface-400">{subscriberLabel}</p>
              )}
            </div>
            {user.photoURL ? (
              <Image
                src={user.photoURL}
                alt={accountName}
                width={32}
                height={32}
                className="rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                {accountName[0].toUpperCase()}
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={handleSignOut} aria-label={t('components.layout.topbar.signOut')}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}
