'use client'

import { cn } from '@/utils/cn'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
  className?: string
}

export function Toggle({ checked, onChange, label, disabled, className }: ToggleProps) {
  return (
    <label className={cn('inline-flex items-center gap-2.5 cursor-pointer', disabled && 'opacity-50 cursor-not-allowed', className)}>
      <button
        role="switch"
        type="button"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus-ring cursor-pointer',
          checked ? 'bg-brand-600' : 'bg-surface-300 dark:bg-surface-700',
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform duration-200',
            checked && 'translate-x-[22px]',
          )}
          style={{ marginTop: '2px' }}
        />
      </button>
      {label && <span className="text-sm text-surface-700 dark:text-surface-300">{label}</span>}
    </label>
  )
}
