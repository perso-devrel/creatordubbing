'use client'

import Link from 'next/link'
import type { ComponentProps } from 'react'
import { useLocalePath } from '@/hooks/useLocalePath'

type LocaleLinkProps = ComponentProps<typeof Link>

export function LocaleLink({ href, ...props }: LocaleLinkProps) {
  const localize = useLocalePath()
  const localizedHref = typeof href === 'string' && href.startsWith('/')
    ? localize(href)
    : href

  return <Link href={localizedHref} {...props} />
}
