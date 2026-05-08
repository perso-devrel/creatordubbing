'use client'

import Image from 'next/image'
import { Moon, Sun, LogOut } from 'lucide-react'
import { useThemeStore } from '@/stores/themeStore'
import { useAuthStore } from '@/stores/authStore'
import { signOut } from '@/lib/google-auth'
import { Button } from '@/components/ui'
import { useRouter } from 'next/navigation'
import { OpsAlertButton } from '@/features/ops/components/OpsAlertButton'

interface TopbarProps {
  isOpsAdmin?: boolean
}

export function Topbar({ isOpsAdmin = false }: TopbarProps = {}) {
  const { mode, toggle } = useThemeStore()
  const { user, clear } = useAuthStore()
  const router = useRouter()

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
        <Button variant="ghost" size="sm" onClick={toggle} aria-label="테마 전환">
          {mode === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
        </Button>
        {isOpsAdmin && <OpsAlertButton />}

        {user && (
          <div className="ml-2 flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-surface-900 dark:text-white leading-tight">
                {user.displayName || '사용자'}
              </p>
              <p className="text-xs text-surface-400 leading-tight">{user.email}</p>
            </div>
            {user.photoURL ? (
              <Image
                src={user.photoURL}
                alt={user.displayName || ''}
                width={32}
                height={32}
                className="rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-600 text-sm font-bold text-white">
                {(user.displayName || user.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={handleSignOut} aria-label="로그아웃">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}
