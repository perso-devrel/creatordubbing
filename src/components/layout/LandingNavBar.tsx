'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Languages, Moon, Sun } from 'lucide-react'
import { useThemeStore } from '@/stores/themeStore'
import { useAuthStore } from '@/stores/authStore'
import { signInWithGoogle } from '@/lib/firebase'
import { useNotificationStore } from '@/stores/notificationStore'
import { Button } from '@/components/ui'

export function LandingNavBar() {
  const { mode, toggle } = useThemeStore()
  const { isAuthenticated } = useAuthStore()
  const addToast = useNotificationStore((s) => s.addToast)
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      const { user } = await signInWithGoogle()
      useAuthStore.getState().setUser(user)
      router.push('/dashboard')
    } catch (err) {
      addToast({ type: 'error', title: '로그인 실패', message: err instanceof Error ? err.message : '' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-surface-200/50 bg-white/80 backdrop-blur-md dark:border-surface-800/50 dark:bg-surface-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-brand-500">
            <Languages className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-lg font-bold text-surface-900 dark:text-surface-100">
            Creator<span className="text-brand-500">Dub</span>
          </span>
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          <a href="#features" className="text-sm text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100">기능</a>
          <a href="#pricing" className="text-sm text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100">요금제</a>
          <a href="#how-it-works" className="text-sm text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100">이용 방법</a>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={toggle} aria-label="테마 전환">
            {mode === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          {isAuthenticated ? (
            <Link href="/dashboard">
              <Button size="sm">대시보드</Button>
            </Link>
          ) : (
            <Button size="sm" onClick={handleGoogleLogin} loading={loading}>
              Google로 시작하기
            </Button>
          )}
        </div>
      </div>
    </nav>
  )
}
