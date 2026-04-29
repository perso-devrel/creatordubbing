import Link from 'next/link'
import { Languages } from 'lucide-react'

export function LandingFooter() {
  return (
    <footer className="border-t border-surface-200 bg-surface-50 py-12 dark:border-surface-800 dark:bg-surface-950">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-brand-600 to-brand-500">
              <Languages className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-surface-900 dark:text-surface-100">
              Dub<span className="text-brand-500">tube</span>
            </span>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
            <Link
              href="/privacy"
              className="text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100"
            >
              개인정보처리방침
            </Link>
            <Link
              href="/terms"
              className="text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100"
            >
              서비스 약관
            </Link>
            <a
              href="mailto:devrel.365@gmail.com"
              className="text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100"
            >
              문의
            </a>
          </nav>

          <p className="text-xs text-surface-500">
            &copy; {new Date().getFullYear()} Dubtube. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
