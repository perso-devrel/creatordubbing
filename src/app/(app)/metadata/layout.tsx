import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '메타데이터 번역',
}

export default function MetadataLayout({ children }: { children: React.ReactNode }) {
  return children
}
