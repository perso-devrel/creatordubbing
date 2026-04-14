'use client'

import { type ReactNode, useEffect, useRef, useCallback } from 'react'
import { cn } from '@/utils/cn'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
}

const FOCUSABLE = 'a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])'

export function Modal({ open, onClose, title, children, className, size = 'md' }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key !== 'Tab') return
    const el = dialogRef.current
    if (!el) return
    const focusable = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE))
    if (focusable.length === 0) { e.preventDefault(); return }
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }, [onClose])

  useEffect(() => {
    if (!open) return
    previousFocusRef.current = document.activeElement as HTMLElement | null
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    const el = dialogRef.current
    if (el) {
      const first = el.querySelector<HTMLElement>(FOCUSABLE)
      if (first) first.focus()
      else el.focus()
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      previousFocusRef.current?.focus()
    }
  }, [open, handleKeyDown])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={cn(
          'relative z-10 w-full rounded-2xl border border-surface-200 bg-white p-6 shadow-2xl animate-fade-in dark:border-surface-800 dark:bg-surface-900 outline-none',
          sizes[size],
          className,
        )}
      >
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100">{title}</h2>
            <button onClick={onClose} aria-label="닫기" className="rounded-lg p-1 text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
