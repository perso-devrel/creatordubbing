import { apiOk } from '@/lib/api/response'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const COOKIES_TO_CLEAR = ['creatordub_session', 'google_access_token']

export async function POST() {
  const res = apiOk(null)
  for (const name of COOKIES_TO_CLEAR) {
    res.cookies.set(name, '', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 0,
    })
  }
  return res
}
