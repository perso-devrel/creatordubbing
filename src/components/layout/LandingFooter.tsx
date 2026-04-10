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
              Creator<span className="text-brand-500">Dub</span>
            </span>
          </div>
          <p className="text-sm text-surface-500">
            &copy; {new Date().getFullYear()} CreatorDub. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
