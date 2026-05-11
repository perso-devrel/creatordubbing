'use client'

import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface NotificationState {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  clearAll: () => void
}

let toastId = 0
const timers = new Map<string, ReturnType<typeof setTimeout>>()

export const useNotificationStore = create<NotificationState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = `toast-${++toastId}`
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }))
    const duration = toast.duration ?? 4000
    if (duration > 0) {
      timers.set(
        id,
        setTimeout(() => {
          timers.delete(id)
          set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
        }, duration),
      )
    }
  },
  removeToast: (id) => {
    const timer = timers.get(id)
    if (timer) { clearTimeout(timer); timers.delete(id) }
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
  },
  clearAll: () => {
    timers.forEach(clearTimeout)
    timers.clear()
    set({ toasts: [] })
  },
}))
