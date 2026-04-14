import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '결제',
}

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return children
}
