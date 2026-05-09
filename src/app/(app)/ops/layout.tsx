import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '운영 상태',
}

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  return children
}
