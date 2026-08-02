/**
 * Which routes need a session, and where a user goes once they have one.
 *
 * Deliberately free of Next and Supabase imports: the Proxy runs this in the
 * Edge runtime, the login Server Action runs it in Node, and the login form
 * ships it to the browser. Staying plain also means the redirect rules can be
 * unit tested without standing up a request.
 */

/** Where a signed-out request to a protected route is sent. */
export const LOGIN_ROUTE = '/login'

/** Query parameter carrying the route the user was trying to reach. */
export const REDIRECT_PARAM = 'next'

/** Where a login lands when no specific route was requested. */
export const DEFAULT_REDIRECT = '/'

/**
 * Routes reachable without a session. Everything else is gated, so a route
 * added later is protected by where it sits, not by remembering to list it.
 */
const PUBLIC_ROUTES = [LOGIN_ROUTE, '/signup', '/'] as const

/**
 * True for a route that does not require a session. Matches on prefix, so
 * `/login` also covers any `/login/...` sub-route added later.
 */
export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  )
}

/** Drops the query string and hash, leaving the path to match on. */
function pathnameOf(target: string): string {
  return target.split(/[?#]/)[0]
}

/**
 * True when the string holds a C0 control character or DEL. Written as a code
 * point scan rather than a regex because a character class of raw control
 * characters is invisible in a diff and easy to mangle in an editor.
 */
function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)

    if (code < 0x20 || code === 0x7f) {
      return true
    }
  }

  return false
}

/**
 * Narrows an untrusted `next` value down to a path worth redirecting to,
 * falling back to the home page.
 *
 * The value arrives from the query string, and again from a form field on the
 * way back, so it is attacker-controlled in both places. Anything a browser
 * could read as another origin has to be rejected, or login becomes an open
 * redirect: a link to `/login?next=https://evil.example` would hand a freshly
 * authenticated user straight to someone else's site.
 */
export function safeRedirectPath(target: string | null | undefined): string {
  if (!target || !target.startsWith('/')) {
    return DEFAULT_REDIRECT
  }

  // `//evil.example` and `/\evil.example` both resolve to another host once a
  // browser normalises them, despite starting with a single slash.
  if (target[1] === '/' || target[1] === '\\') {
    return DEFAULT_REDIRECT
  }

  // Browsers strip tabs, newlines and other control characters before
  // resolving a URL, which can smuggle a `//` past the check above.
  if (hasControlCharacter(target)) {
    return DEFAULT_REDIRECT
  }

  // Sending a user who just signed in back to the login form would bounce them
  // straight out of the app again.
  if (isPublicRoute(pathnameOf(target))) {
    return DEFAULT_REDIRECT
  }

  return target
}
