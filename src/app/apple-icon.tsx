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
          background: 'linear-gradient(180deg, #FF8A4A 0%, #F2453D 100%)',
          borderRadius: 40,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          justifyContent: 'center',
          width: '100%',
          gap: 14,
        }}
      >
        <div
          style={{
            alignItems: 'center',
            background: '#ffffff',
            borderRadius: '50%',
            display: 'flex',
            height: 78,
            justifyContent: 'center',
            width: 78,
          }}
        >
          <div
            style={{
              borderTop: '14px solid transparent',
              borderBottom: '14px solid transparent',
              borderLeft: '22px solid #F2453D',
              height: 0,
              marginLeft: 6,
              width: 0,
            }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ background: '#ffffff', borderRadius: 999, height: 9, width: 86 }} />
          <div style={{ background: '#ffffff', borderRadius: 999, height: 9, width: 66 }} />
        </div>
      </div>
    ),
    size,
  )
}
