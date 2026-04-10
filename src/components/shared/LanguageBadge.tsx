import { cn } from '@/utils/cn'
import { getLanguageByCode } from '@/utils/languages'

interface LanguageBadgeProps {
  code: string
  className?: string
}

export function LanguageBadge({ code, className }: LanguageBadgeProps) {
  const lang = getLanguageByCode(code)
  if (!lang) return null

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md bg-surface-100 px-1.5 py-0.5 text-xs font-medium text-surface-700 dark:bg-surface-800 dark:text-surface-300',
        className,
      )}
    >
      <span>{lang.flag}</span>
      <span>{code.toUpperCase()}</span>
    </span>
  )
}
