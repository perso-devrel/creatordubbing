import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySessionCookie } from '@/lib/auth/session-cookie'

export async function middleware(request: NextRequest) {
  const raw = request.cookies.get(SESSION_COOKIE)?.value
  if (!raw || !(await verifySessionCookie(raw))) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/dubbing/:path*',
    '/batch/:path*',
    '/youtube/:path*',
    '/billing/:path*',
    '/settings/:path*',
    '/uploads/:path*',
  ],
}
