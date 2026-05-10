'use client'

import { useEffect, type ReactNode } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner'
import { useLocaleText } from '@/hooks/useLocaleText'
import { useLocaleRouter } from '@/hooks/useLocalePath'

interface AuthGuardProps {
  children?: ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuthStore()
  const router = useLocaleRouter()
  const t = useLocaleText()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/')
    }
  }, [isLoading, isAuthenticated, router])

  if (isLoading) {
    return <LoadingSpinner size="lg" className="min-h-screen" label={t('features.auth.components.authGuard.loading')} />
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
