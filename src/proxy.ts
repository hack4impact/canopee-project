import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  DEFAULT_REDIRECT,
  isPublicRoute,
  LOGIN_ROUTE,
  REDIRECT_PARAM,
} from '@/lib/auth/routes'

function loginUrl(request: NextRequest): URL {
  const query = new URLSearchParams(request.nextUrl.search)

  query.delete('_rsc')

  const search = query.toString()
  const target = search
    ? `${request.nextUrl.pathname}?${search}`
    : request.nextUrl.pathname

  const url = request.nextUrl.clone()
  url.pathname = LOGIN_ROUTE
  url.search = ''

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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !isPublicRoute(pathname)) {
    const redirect = NextResponse.redirect(loginUrl(request))

    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))

    return redirect
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
