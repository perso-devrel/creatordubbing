'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Languages, Moon, Sun } from 'lucide-react'
import { useThemeStore } from '@/stores/themeStore'
import { useAuthStore } from '@/stores/authStore'
import { signInWithGoogle } from '@/lib/google-auth'
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
      const message = err instanceof Error && err.message.includes('팝업')
        ? '팝업 차단을 허용한 뒤 다시 로그인해 주세요.'
        : '잠시 후 다시 시도해 주세요. 문제가 계속되면 문의해 주세요.'
      addToast({ type: 'error', title: '로그인할 수 없습니다', message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-surface-200/50 bg-white/80 backdrop-blur-md dark:border-surface-800/50 dark:bg-surface-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
            <Languages className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-lg font-bold text-surface-900 dark:text-surface-100">
            Dub<span className="text-brand-500">tube</span>
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
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              aria-label="Google로 시작하기"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-[#747775] bg-white px-3 text-sm font-medium text-[#1f1f1f] transition-colors hover:bg-[#f8f9fa] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b57d0] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#8e918f] dark:bg-[#131314] dark:text-[#e3e3e3] dark:hover:bg-[#1f1f1f]"
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              <span>Google로 시작하기</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
