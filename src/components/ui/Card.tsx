import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-surface-200 bg-white p-5 shadow-sm shadow-surface-950/[0.03] dark:border-surface-800 dark:bg-surface-900',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-base font-semibold tracking-normal text-surface-900 dark:text-surface-100', className)} {...props}>
      {children}
    </h3>
  )
}
