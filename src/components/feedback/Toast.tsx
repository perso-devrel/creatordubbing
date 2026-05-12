'use client'

import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useNotificationStore, type ToastType } from '@/stores/notificationStore'
import { useLocaleText } from '@/hooks/useLocaleText'

const icons: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
}

const styles: Record<ToastType, string> = {
  success: 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20',
  error: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20',
  info: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20',
  warning: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20',
}

const iconColors: Record<ToastType, string> = {
  success: 'text-emerald-600 dark:text-emerald-400',
  error: 'text-red-600 dark:text-red-400',
  info: 'text-blue-600 dark:text-blue-400',
  warning: 'text-amber-600 dark:text-amber-400',
}

export function ToastContainer() {
  const { toasts, removeToast } = useNotificationStore()
  const t = useLocaleText()

  if (toasts.length === 0) return null

  return (
    <div role="status" aria-live="polite" aria-atomic="false" className="fixed bottom-4 right-4 z-100 flex max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = icons[toast.type]
        return (
          <div
            key={toast.id}
            className={cn(
              'flex w-[calc(100vw-2rem)] max-w-105 items-start gap-3 rounded-lg border p-4 shadow-lg animate-slide-up sm:w-105',
              styles[toast.type],
            )}
          >
            <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', iconColors[toast.type])} aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="wrap-break-word text-sm font-medium text-surface-900 dark:text-surface-100">{toast.title}</p>
              {toast.message && (
                <p className="mt-0.5 wrap-break-word text-sm text-surface-600 dark:text-surface-400">{toast.message}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              aria-label={t('components.feedback.toast.closeNotification')}
              className="shrink-0 rounded p-0.5 text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
