'use client'

import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/utils/cn'
import { Loader2 } from 'lucide-react'

const variants = {
  primary:
    'bg-brand-600 text-white shadow-sm shadow-brand-900/10 hover:bg-brand-700 active:bg-brand-800',
  secondary:
    'border border-surface-200 bg-white text-surface-800 shadow-sm shadow-surface-950/5 hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-850 dark:text-surface-100 dark:hover:bg-surface-800',
  ghost: 'text-surface-700 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800',
  destructive: 'bg-red-600 text-white shadow-sm shadow-red-950/10 hover:bg-red-700 active:bg-red-800',
  outline:
    'border border-surface-300 bg-transparent text-surface-700 hover:border-surface-400 hover:bg-white dark:border-surface-700 dark:text-surface-300 dark:hover:border-surface-600 dark:hover:bg-surface-850',
} as const

const sizes = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2.5',
} as const

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-semibold transition-colors duration-150 focus-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
          variants[variant],
          sizes[size],
          className,
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    )
  },
)
Button.displayName = 'Button'
