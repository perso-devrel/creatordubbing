import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '배치 큐',
}

export default function BatchLayout({ children }: { children: React.ReactNode }) {
  return children
}
