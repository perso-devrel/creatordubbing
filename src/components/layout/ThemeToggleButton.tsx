'use client'

import { useSyncExternalStore } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui'
import { useThemeStore } from '@/stores/themeStore'
import { cn } from '@/utils/cn'
import { useLocaleText } from '@/hooks/useLocaleText'

interface ThemeToggleButtonProps {
  iconClassName?: string
}

export function ThemeToggleButton({ iconClassName = 'h-4 w-4' }: ThemeToggleButtonProps) {
  const { mode, toggle } = useThemeStore()
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
  const t = useLocaleText()

  return (
    <Button variant="ghost" size="sm" onClick={toggle} aria-label={t({ ko: '테마 전환', en: 'Toggle theme' })}>
      {mounted ? (
        mode === 'dark' ? <Sun className={iconClassName} /> : <Moon className={iconClassName} />
      ) : (
        <Moon className={cn(iconClassName, 'opacity-0')} aria-hidden />
      )}
    </Button>
  )
}
