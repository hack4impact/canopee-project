'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { usePathname } from 'next/navigation'
import { isPublicRoute } from '@/lib/auth/routes'

const ACTIVE_PATROL_ENDPOINT = '/api/patrols/active'

const UNAVAILABLE_RETRY_DELAY_MS = 2000

export type ActivePatrolState =
  | { status: 'unavailable' }
  | { status: 'idle' }
  | { status: 'active'; startedAt: string; id: string | null }

type PatrolValue = {
  state: ActivePatrolState
  refresh: () => Promise<void>
  /** Where the bottom nav wants the patrol shell drawn, or null when no nav is mounted. */
  dock: HTMLElement | null
  setDock: (node: HTMLElement | null) => void
}

const PatrolContext = createContext<PatrolValue | null>(null)

export function usePatrol(): PatrolValue {
  const value = useContext(PatrolContext)

  if (!value) {
    throw new Error('usePatrol must be used inside a PatrolProvider')
  }

  return value
}

/**
 * The patrol state is shared by the bottom nav and the patrol controls, so it
 * lives in the root layout. The initial state is rendered server-side (so the
 * nav is right on first paint, with no fetch delay); this keeps it in step with
 * the session afterwards.
 */
export function PatrolProvider({
  initialStartedAt,
  children,
}: {
  /** ISO string of the running patrol, or null; rendered server-side. */
  initialStartedAt: string | null
  children: ReactNode
}) {
  const pathname = usePathname()
  const [dock, setDock] = useState<HTMLElement | null>(null)
  const [state, setState] = useState<ActivePatrolState>(() =>
    initialStartedAt
      ? { status: 'active', startedAt: initialStartedAt, id: null }
      : { status: 'idle' },
  )

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(ACTIVE_PATROL_ENDPOINT, {
        redirect: 'manual',
      })

      if (!response.ok) {
        // Not signed in, not approved, or the request failed: no controls.
        setState({ status: 'unavailable' })
        return
      }

      const payload = (await response.json()) as {
        id: string | null
        startedAt: string | null
      }

      setState(
        payload.startedAt
          ? { status: 'active', startedAt: payload.startedAt, id: payload.id }
          : { status: 'idle' },
      )
    } catch {
      setState({ status: 'unavailable' })
    }
  }, [])

  useEffect(() => {
    const frame = requestAnimationFrame(() => void refresh())

    return () => cancelAnimationFrame(frame)
  }, [refresh, pathname])

  useEffect(() => {
    if (state.status !== 'unavailable' || isPublicRoute(pathname)) {
      return
    }

    const timer = setInterval(() => void refresh(), UNAVAILABLE_RETRY_DELAY_MS)

    return () => clearInterval(timer)
  }, [state.status, pathname, refresh])

  // The auth state can also change in another tab or when the page is restored
  // from the back/forward cache.
  useEffect(() => {
    function refreshOnVisible() {
      void refresh()
    }

    window.addEventListener('focus', refreshOnVisible)
    window.addEventListener('pageshow', refreshOnVisible)

    return () => {
      window.removeEventListener('focus', refreshOnVisible)
      window.removeEventListener('pageshow', refreshOnVisible)
    }
  }, [refresh])

  return (
    <PatrolContext value={{ state, refresh, dock, setDock }}>
      {children}
    </PatrolContext>
  )
}
