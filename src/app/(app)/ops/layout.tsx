import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Operations',
}

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  return children
}
