'use client'

import { Languages } from 'lucide-react'
import { LocaleLink } from '@/components/i18n/LocaleLink'
import { useLocaleText } from '@/hooks/useLocaleText'

export function LandingFooter() {
  const t = useLocaleText()

  return (
    <footer className="border-t border-surface-200 bg-surface-50 py-12 dark:border-surface-800 dark:bg-surface-950">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-600">
              <Languages className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-surface-900 dark:text-surface-100">
              sub<span className="text-brand-600 dark:text-brand-400">2tube</span>
            </span>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
            <LocaleLink
              href="/privacy"
              className="text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100"
            >
              {t('components.layout.landingFooter.privacyPolicy')}
            </LocaleLink>
            <LocaleLink
              href="/terms"
              className="text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100"
            >
              {t('components.layout.landingFooter.termsOfService')}
            </LocaleLink>
            <LocaleLink
              href="/support"
              className="text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100"
            >
              {t('components.layout.landingFooter.contact')}
            </LocaleLink>
          </nav>

          <p className="text-xs text-surface-500 dark:text-surface-400">
            &copy; {new Date().getFullYear()} sub2tube. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
