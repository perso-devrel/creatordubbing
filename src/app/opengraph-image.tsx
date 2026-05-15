import { ImageResponse } from 'next/og'
import { SITE_NAME } from '@/lib/seo'

export const alt = 'sub2tube - AI caption and dubbing tools for YouTube creators'

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
          <div style={{ alignItems: 'center', display: 'flex', gap: 22 }}>
            <div
              style={{
                alignItems: 'center',
                background: 'linear-gradient(180deg, #FF8A4A 0%, #F2453D 100%)',
                borderRadius: 22,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                height: 96,
                justifyContent: 'center',
                width: 96,
              }}
            >
              <div
                style={{
                  alignItems: 'center',
                  background: '#ffffff',
                  borderRadius: '50%',
                  display: 'flex',
                  height: 42,
                  justifyContent: 'center',
                  width: 42,
                }}
              >
                <div
                  style={{
                    borderTop: '7px solid transparent',
                    borderBottom: '7px solid transparent',
                    borderLeft: '12px solid #F2453D',
                    height: 0,
                    marginLeft: 4,
                    width: 0,
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ background: '#ffffff', borderRadius: 999, height: 4, width: 46 }} />
                <div style={{ background: '#ffffff', borderRadius: 999, height: 4, width: 34 }} />
              </div>
            </div>
            <div style={{ color: '#0f1115', display: 'flex', fontSize: 48, fontWeight: 800 }}>
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
