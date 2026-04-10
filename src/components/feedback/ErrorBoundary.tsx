'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100">문제가 발생했습니다</h2>
          <p className="max-w-md text-sm text-surface-500">{this.state.error?.message}</p>
          <Button variant="secondary" onClick={() => this.setState({ hasError: false })}>
            다시 시도
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}
