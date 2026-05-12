import { ImageResponse } from 'next/og'
import { SITE_NAME } from '@/lib/seo'

export const alt = 'Dubtube - AI caption and dubbing tools for YouTube creators'

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0f1115',
          color: '#ffffff',
          display: 'flex',
          height: '100%',
          padding: 64,
          width: '100%',
        }}
      >
        <div
          style={{
            background: '#ffffff',
            borderRadius: 28,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            justifyContent: 'space-between',
            padding: 52,
            width: '100%',
          }}
        >
          <div style={{ alignItems: 'center', display: 'flex', gap: 18 }}>
            <div
              style={{
                alignItems: 'center',
                background: '#0f1115',
                borderRadius: 18,
                display: 'flex',
                height: 72,
                justifyContent: 'center',
                width: 72,
              }}
            >
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  height: 38,
                  justifyContent: 'center',
                  padding: '0 8px',
                  position: 'relative',
                  width: 46,
                }}
              >
                <div
                  style={{
                    background: '#ffffff',
                    bottom: -5,
                    height: 12,
                    left: 10,
                    position: 'absolute',
                    transform: 'rotate(45deg)',
                    width: 12,
                  }}
                />
                <div style={{ background: '#14b8a6', borderRadius: 999, height: 5, marginBottom: 6, width: 28 }} />
                <div style={{ background: '#f97316', borderRadius: 999, height: 5, width: 20 }} />
              </div>
            </div>
            <div style={{ color: '#0f1115', display: 'flex', fontSize: 42, fontWeight: 800 }}>
              {SITE_NAME}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div
              style={{
                color: '#0f1115',
                display: 'flex',
                fontSize: 78,
                fontWeight: 800,
                letterSpacing: 0,
                lineHeight: 1.02,
                maxWidth: 860,
              }}
            >
              Captions and dubbing for YouTube creators
            </div>
            <div
              style={{
                color: '#4b5563',
                display: 'flex',
                fontSize: 32,
                fontWeight: 500,
                lineHeight: 1.3,
                maxWidth: 820,
              }}
            >
              Prepare translated captions, dubs, and upload-ready metadata from one video.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 14 }}>
            {['Dubs', 'Captions', 'Titles', 'YouTube upload'].map((label) => (
              <div
                key={label}
                style={{
                  background: '#f7f8fa',
                  border: '1px solid #e1e6eb',
                  borderRadius: 999,
                  color: '#374151',
                  display: 'flex',
                  fontSize: 24,
                  fontWeight: 700,
                  padding: '12px 20px',
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  )
}
