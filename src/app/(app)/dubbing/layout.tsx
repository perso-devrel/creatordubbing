import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '새 더빙',
}

export default function DubbingLayout({ children }: { children: React.ReactNode }) {
  return children
}
