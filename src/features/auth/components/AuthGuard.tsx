'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner'
import { useLocaleText } from '@/hooks/useLocaleText'

interface AuthGuardProps {
  children?: ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuthStore()
  const router = useRouter()
  const t = useLocaleText()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/')
    }
  }, [isLoading, isAuthenticated, router])

  if (isLoading) {
    return <LoadingSpinner size="lg" className="min-h-screen" label={t({ ko: '로딩 중...', en: 'Loading...' })} />
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
