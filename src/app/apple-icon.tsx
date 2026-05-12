import { ImageResponse } from 'next/og'

export const size = {
  width: 180,
  height: 180,
}

export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'center',
          background: '#0f1115',
          borderRadius: 40,
          display: 'flex',
          height: '100%',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        <div
          style={{
            background: '#ffffff',
            borderRadius: 24,
            display: 'flex',
            flexDirection: 'column',
            height: 92,
            justifyContent: 'center',
            padding: '0 20px',
            position: 'relative',
            width: 116,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              bottom: -14,
              height: 28,
              left: 26,
              position: 'absolute',
              transform: 'rotate(45deg)',
              width: 28,
            }}
          />
          <div style={{ background: '#14b8a6', borderRadius: 999, height: 12, marginBottom: 16, width: 72 }} />
          <div style={{ background: '#f97316', borderRadius: 999, height: 12, width: 52 }} />
        </div>
      </div>
    ),
    size,
  )
}
