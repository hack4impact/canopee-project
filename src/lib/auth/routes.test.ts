import { describe, expect, it } from 'vitest'
import {
  DEFAULT_REDIRECT,
  getPostLoginRedirect,
  isPublicRoute,
  LOGIN_ROUTE,
  safeRedirectPath,
} from './routes'

/** Builds a path containing one raw control character, by code point. */
function withControlCharacter(code: number): string {
  return `/${String.fromCharCode(code)}/evil.example`
}

describe('isPublicRoute', () => {
  it('allows the login and signup forms', () => {
    expect(isPublicRoute(LOGIN_ROUTE)).toBe(true)
    expect(isPublicRoute('/signup')).toBe(true)
  })

  it('allows sub-routes of a public route', () => {
    expect(isPublicRoute('/login/reset')).toBe(true)
    expect(isPublicRoute('/signup/confirm')).toBe(true)
  })

  it('gates everything else, including the home page', () => {
    expect(isPublicRoute('/')).toBe(false)
    expect(isPublicRoute('/admin/volunteers')).toBe(false)
    expect(isPublicRoute('/map')).toBe(false)
  })

  it('does not treat a route that merely starts with a public name as public', () => {
    expect(isPublicRoute('/loginy')).toBe(false)
    expect(isPublicRoute('/signup-admin')).toBe(false)
  })
})

describe('getPostLoginRedirect', () => {
  it('returns the requested route for approved users', () => {
    expect(getPostLoginRedirect('/admin/volunteers', true)).toBe(
      '/admin/volunteers',
    )
    expect(getPostLoginRedirect('/reports', true)).toBe('/reports')
  })

  it('sends unapproved users to the pending screen', () => {
    expect(getPostLoginRedirect('/admin/volunteers', false)).toBe('/pending')
    expect(getPostLoginRedirect('/reports', false)).toBe('/pending')
  })
})

describe('safeRedirectPath', () => {
  it('keeps a plain in-app path', () => {
    expect(safeRedirectPath('/')).toBe('/')
    expect(safeRedirectPath('/admin/volunteers')).toBe('/admin/volunteers')
  })

  it('keeps the query string and hash of the requested route', () => {
    expect(safeRedirectPath('/reports?category=trees&page=2')).toBe(
      '/reports?category=trees&page=2',
    )
    expect(safeRedirectPath('/map#pin-42')).toBe('/map#pin-42')
  })

  it('falls back when nothing was requested', () => {
    expect(safeRedirectPath(undefined)).toBe(DEFAULT_REDIRECT)
    expect(safeRedirectPath(null)).toBe(DEFAULT_REDIRECT)
    expect(safeRedirectPath('')).toBe(DEFAULT_REDIRECT)
  })

  it('rejects an absolute URL to another origin', () => {
    expect(safeRedirectPath('https://evil.example/steal')).toBe(
      DEFAULT_REDIRECT,
    )
    expect(safeRedirectPath('http://evil.example')).toBe(DEFAULT_REDIRECT)
    expect(safeRedirectPath('javascript:alert(1)')).toBe(DEFAULT_REDIRECT)
  })

  it('rejects a protocol-relative URL, which starts with a single slash', () => {
    expect(safeRedirectPath('//evil.example')).toBe(DEFAULT_REDIRECT)
    expect(safeRedirectPath('//evil.example/reports')).toBe(DEFAULT_REDIRECT)
  })

  it('rejects a backslash, which browsers normalise to a slash', () => {
    expect(safeRedirectPath('/\\evil.example')).toBe(DEFAULT_REDIRECT)
    expect(safeRedirectPath('/\\/evil.example')).toBe(DEFAULT_REDIRECT)
  })

  it('rejects control characters that browsers strip before resolving a URL', () => {
    // `/<tab>/evil.example` becomes `//evil.example` once the tab is stripped.
    expect(safeRedirectPath(withControlCharacter(0x09))).toBe(DEFAULT_REDIRECT)
    expect(safeRedirectPath(withControlCharacter(0x0a))).toBe(DEFAULT_REDIRECT)
    expect(safeRedirectPath(withControlCharacter(0x0d))).toBe(DEFAULT_REDIRECT)
    expect(safeRedirectPath(withControlCharacter(0x00))).toBe(DEFAULT_REDIRECT)
    expect(safeRedirectPath(withControlCharacter(0x7f))).toBe(DEFAULT_REDIRECT)
  })

  it('rejects a relative path, which could resolve outside the app', () => {
    expect(safeRedirectPath('reports')).toBe(DEFAULT_REDIRECT)
    expect(safeRedirectPath('../reports')).toBe(DEFAULT_REDIRECT)
  })

  it('rejects a public route, so login does not bounce the user back to itself', () => {
    expect(safeRedirectPath(LOGIN_ROUTE)).toBe(DEFAULT_REDIRECT)
    expect(safeRedirectPath('/signup')).toBe(DEFAULT_REDIRECT)
    expect(safeRedirectPath('/login?next=/login')).toBe(DEFAULT_REDIRECT)
  })

  it('matches a public route on its path, ignoring query and hash', () => {
    expect(safeRedirectPath('/login#form')).toBe(DEFAULT_REDIRECT)
    // A protected path that only *contains* a public name is still fine.
    expect(safeRedirectPath('/reports?from=/login')).toBe(
      '/reports?from=/login',
    )
  })
})
