import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySessionCookie } from '@/lib/auth/session-cookie'
import {
  DEFAULT_APP_LOCALE,
  getPathLocale,
  isAppLocale,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_HEADER,
  resolveLocaleFromAcceptLanguage,
  resolvePreferredLocale,
  stripLocalePrefix,
  withLocalePath,
  type AppLocale,
} from '@/lib/i18n/config'

const PROTECTED_PATHS = [
  '/dashboard',
  '/dubbing',
  '/metadata',
  '/batch',
  '/youtube',
  '/billing',
  '/settings',
  '/uploads',
  '/ops',
]

const UNLOCALIZED_ALLOWED_PATHS = ['/auth/callback']

function getRequestLocale(request: NextRequest): AppLocale {
  const pathLocale = getPathLocale(request.nextUrl.pathname)
  if (pathLocale) return pathLocale

  return resolvePreferredLocale(
    request.cookies.get(LOCALE_COOKIE)?.value,
    resolveLocaleFromAcceptLanguage(request.headers.get('accept-language'), DEFAULT_APP_LOCALE),
  )
}

function withLocaleHeader(request: NextRequest, locale: AppLocale) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(LOCALE_HEADER, locale)
  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: 'lax',
  })
  return response
}

function redirectWithLocaleCookie(request: NextRequest, path: string, locale: AppLocale) {
  const url = request.nextUrl.clone()
  url.pathname = path
  const response = NextResponse.redirect(url)
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: 'lax',
  })
  return response
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const locale = getRequestLocale(request)
  const pathLocale = getPathLocale(pathname)

  if (UNLOCALIZED_ALLOWED_PATHS.includes(pathname)) {
    return withLocaleHeader(request, locale)
  }

  if (!pathLocale) {
    return redirectWithLocaleCookie(request, withLocalePath(pathname, locale), locale)
  }

  if (!isAppLocale(pathLocale)) {
    return redirectWithLocaleCookie(request, withLocalePath(stripLocalePrefix(pathname), locale), locale)
  }

  const pathnameWithoutLocale = stripLocalePrefix(pathname)
  if (!isProtectedPath(pathnameWithoutLocale)) {
    return withLocaleHeader(request, pathLocale)
  }

  const raw = request.cookies.get(SESSION_COOKIE)?.value
  if (!raw || !(await verifySessionCookie(raw))) {
    return redirectWithLocaleCookie(request, `/${pathLocale}`, pathLocale)
  }

  return withLocaleHeader(request, pathLocale)
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|apple-icon|opengraph-image|twitter-image|.*\\..*).*)',
  ],
}
