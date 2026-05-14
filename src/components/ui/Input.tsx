'use client'

import { type InputHTMLAttributes, forwardRef, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold text-surface-700 dark:text-surface-300">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400">{icon}</span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'h-10 w-full rounded-md border border-surface-300 bg-white px-3 text-sm text-surface-900 shadow-sm shadow-surface-950/[0.02] placeholder:text-surface-400 transition-colors focus:border-brand-500 focus-ring dark:border-surface-700 dark:bg-surface-850 dark:text-surface-100 dark:placeholder:text-surface-500',
              icon && 'pl-10',
              error && 'border-red-500 dark:border-red-500',
              className,
            )}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      </div>
    )
  },
)
Input.displayName = 'Input'
