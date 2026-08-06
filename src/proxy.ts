import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  DEFAULT_REDIRECT,
  isPublicRoute,
  LOGIN_ROUTE,
  REDIRECT_PARAM,
} from '@/lib/auth/routes'

/**
 * The `/login` URL to bounce a signed-out request to, tagged with where the
 * user was heading so the login action can send them back there.
 */
function loginUrl(request: NextRequest): URL {
  const query = new URLSearchParams(request.nextUrl.search)

  // Client-side navigations ask for the React payload with a `_rsc` cache
  // buster. Keeping it would leave it in the address bar after login.
  query.delete('_rsc')

  const search = query.toString()
  const target = search
    ? `${request.nextUrl.pathname}?${search}`
    : request.nextUrl.pathname

  const url = request.nextUrl.clone()
  url.pathname = LOGIN_ROUTE
  url.search = ''

  // `/login?next=%2F` is noise: that is where login goes anyway.
  if (target !== DEFAULT_REDIRECT) {
    url.searchParams.set(REDIRECT_PARAM, target)
  }

  return url
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      'NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set: no session can be read, so every protected route is being treated as signed out.',
    )

    // Fail closed. Without the keys there is no way to show a request is
    // authenticated, and waving it through would serve protected pages to
    // anyone the moment the environment is misconfigured.
    return isPublicRoute(pathname)
      ? NextResponse.next({ request })
      : NextResponse.redirect(loginUrl(request))
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  // Validates the token against Supabase rather than trusting the cookie, and
  // refreshes it through the `setAll` handler above when it is close to expiry.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !isPublicRoute(pathname)) {
    const redirect = NextResponse.redirect(loginUrl(request))

    // Carry over whatever Supabase just wrote. When a refresh token is
    // rejected it clears the session cookies here, and dropping those headers
    // would leave the dead token in the browser to fail again next request.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))

    return redirect
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
