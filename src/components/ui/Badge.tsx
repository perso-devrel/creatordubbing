import type { HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

const variants = {
  default: 'border border-surface-200 bg-surface-50 text-surface-700 dark:border-surface-700 dark:bg-surface-850 dark:text-surface-300',
  brand: 'border border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-900/70 dark:bg-brand-900/25 dark:text-brand-300',
  success: 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-900/25 dark:text-emerald-300',
  warning: 'border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-900/25 dark:text-amber-300',
  error: 'border border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-900/25 dark:text-red-300',
  info: 'border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/70 dark:bg-blue-900/25 dark:text-blue-300',
} as const

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants
  truncate?: boolean
}

export function Badge({ className, variant = 'default', truncate, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
        truncate && 'max-w-full overflow-hidden text-ellipsis',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}
