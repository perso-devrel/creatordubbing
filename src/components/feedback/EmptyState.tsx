import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      {icon && <div className="mb-4 text-surface-300 dark:text-surface-600">{icon}</div>}
      <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-surface-500 dark:text-surface-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
