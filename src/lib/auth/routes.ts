export const LOGIN_ROUTE = '/login'

export const REDIRECT_PARAM = 'next'

export const DEFAULT_REDIRECT = '/carte'

export const CITIZEN_REPORT_ROUTE = '/signaler-citoyen'

const PUBLIC_ROUTES = [
  '/',
  LOGIN_ROUTE,
  '/signup',
  CITIZEN_REPORT_ROUTE,
  '/api/cron',
  '/api/public',
  '/.well-known',
] as const

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  )
}

function pathnameOf(target: string): string {
  return target.split(/[?#]/)[0]
}

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)

    if (code < 0x20 || code === 0x7f) {
      return true
    }
  }

  return false
}

export function safeRedirectPath(target: string | null | undefined): string {
  if (!target || !target.startsWith('/')) {
    return DEFAULT_REDIRECT
  }

  if (target[1] === '/' || target[1] === '\\') {
    return DEFAULT_REDIRECT
  }

  if (hasControlCharacter(target)) {
    return DEFAULT_REDIRECT
  }

  if (isPublicRoute(pathnameOf(target))) {
    return DEFAULT_REDIRECT
  }

  return target
}

export function getPostLoginRedirect(
  target: string | null | undefined,
  isApprovedUser: boolean,
): string {
  return isApprovedUser ? safeRedirectPath(target) : '/pending'
}
