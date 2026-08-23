'use client'

import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  useTransition,
} from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  endPatrol,
  startPatrol,
  type PatrolSummary,
} from '@/app/patrouilles/actions'
import { isPublicRoute } from '@/lib/auth/routes'
import { formatElapsed } from '@/lib/patrols/elapsed'
import { usePatrolExitWarning } from '@/lib/patrols/use-patrol-exit-warning'
import {
  usePatrolRecorder,
  type RecordingStatus,
} from '@/lib/patrols/use-patrol-recorder'

const ACTIVE_PATROL_ENDPOINT = '/api/patrols/active'

const UNAVAILABLE_RETRY_DELAY_MS = 2000

const TICK_MS = 1000
const NO_READING_YET = '--:--:--'

const RECORDING_NOTICE: Record<RecordingStatus, string | null> = {
  waiting: 'Recherche du signal GPS…',
  recording: null,
  'signal-lost':
    'Signal GPS perdu. L’enregistrement reprendra automatiquement.',
  denied:
    'Localisation refusée : le trajet de cette patrouille ne sera pas enregistré.',
  unsupported:
    'Ce navigateur ne peut pas enregistrer le trajet de la patrouille.',
  stopped: 'Enregistrement du trajet interrompu. Rechargez la page.',
}

let clockNow = Date.now()
let clockTimer: ReturnType<typeof setInterval> | null = null
const clockSubscribers = new Set<() => void>()

function subscribeToClock(onChange: () => void): () => void {
  clockSubscribers.add(onChange)

  clockNow = Date.now()

  clockTimer ??= setInterval(() => {
    clockNow = Date.now()
    clockSubscribers.forEach((notify) => notify())
  }, TICK_MS)

  return () => {
    clockSubscribers.delete(onChange)

    if (clockSubscribers.size === 0 && clockTimer) {
      clearInterval(clockTimer)
      clockTimer = null
    }
  }
}

function getClock(): number {
  return clockNow
}

function getServerClock(): null {
  return null
}

/**
 * The pause survives client-side navigation: a paused patrol must stay paused
 * when the user visits another page and comes back.
 */
const PAUSE_STORAGE_PREFIX = 'canopee-patrol-pause:'

type StoredPause = {
  paused: boolean
  pausedAtMs: number | null
}

function readStoredPause(startedAt: string): StoredPause {
  if (typeof window === 'undefined') {
    return { paused: false, pausedAtMs: null }
  }

  try {
    const raw = window.sessionStorage.getItem(PAUSE_STORAGE_PREFIX + startedAt)

    if (!raw) {
      return { paused: false, pausedAtMs: null }
    }

    const parsed = JSON.parse(raw) as Partial<StoredPause>

    return {
      paused: Boolean(parsed.paused),
      pausedAtMs:
        typeof parsed.pausedAtMs === 'number' ? parsed.pausedAtMs : null,
    }
  } catch {
    // Unreadable storage: fall back to running.
    return { paused: false, pausedAtMs: null }
  }
}

function writeStoredPause(startedAt: string, pause: StoredPause): void {
  try {
    window.sessionStorage.setItem(
      PAUSE_STORAGE_PREFIX + startedAt,
      JSON.stringify(pause),
    )
  } catch {}
}

function clearStoredPause(startedAt: string): void {
  try {
    window.sessionStorage.removeItem(PAUSE_STORAGE_PREFIX + startedAt)
  } catch {}
}

type ActivePatrolState =
  | { status: 'unavailable' }
  | { status: 'idle' }
  | { status: 'active'; startedAt: string }

/**
 * The patrol controls live in the root layout and must work on any page. The
 * root layout renders the initial patrol state server-side (so the button is
 * there on first paint, with no fetch delay); this hook keeps it in step with
 * the session afterwards.
 */
function useActivePatrol(initialStartedAt: string | null): {
  state: ActivePatrolState
  refresh: () => Promise<void>
} {
  const pathname = usePathname()
  const [state, setState] = useState<ActivePatrolState>(() =>
    initialStartedAt
      ? { status: 'active', startedAt: initialStartedAt }
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

      const payload = (await response.json()) as { startedAt: string | null }

      setState(
        payload.startedAt
          ? { status: 'active', startedAt: payload.startedAt }
          : { status: 'idle' },
      )
    } catch {
      setState({ status: 'unavailable' })
    }
  }, [])

  // Refresh on mount and after every navigation: the session (or the running
  // patrol) may have changed since the last fetch. Without this, the controls
  // would keep their stale state after logging in or out.
  useEffect(() => {
    const frame = requestAnimationFrame(() => void refresh())

    return () => cancelAnimationFrame(frame)
  }, [refresh, pathname])

  // A "not signed in" answer on an app page is usually a transient race right
  // after login. Keep probing so the button appears on its own; a genuinely
  // logged-out user is redirected away by the proxy anyway. The interval is
  // keyed on the status string, so re-renders that keep "unavailable" do not
  // tear it down — it stops the moment the state becomes idle or active.
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

  return { state, refresh }
}

/**
 * The patrol controls: "Démarrer la patrouille" when idle, and the
 * status / pause / stop cluster while a patrol runs. Fixed so they stay in
 * the foreground on every page, above the bottom navigation.
 */
export function PatrolControls({
  initialStartedAt,
}: {
  /** ISO string of the running patrol, or null; rendered server-side. */
  initialStartedAt: string | null
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { state, refresh } = useActivePatrol(initialStartedAt)

  // Auth pages must never show the controls, even when a session is active.
  if (isPublicRoute(pathname)) {
    return null
  }

  if (state.status === 'unavailable') {
    return null
  }

  if (state.status === 'active') {
    return (
      <ActivePatrol
        startedAt={state.startedAt}
        onEnded={(summary) => {
          void refresh()
          router.push(`/patrouilles/${summary.id}?from=patrouille`)
        }}
      />
    )
  }

  return <StartPatrolButton onStarted={() => void refresh()} />
}

function StartPatrolButton({ onStarted }: { onStarted: () => void }) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  function handleClick() {
    setMessage(null)

    startTransition(async () => {
      const result = await startPatrol()
      setMessage(result.message ?? null)

      if (!result.message) {
        onStarted()
      }
    })
  }

  return (
    <div className="fixed bottom-28 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="inline-flex touch-manipulation items-center justify-center rounded-full bg-canopee-green px-8 py-3.5 text-base font-bold tracking-wide text-white shadow-lg shadow-black/25 ring-1 ring-white/20 transition-all duration-150 ease-out hover:-translate-y-0.5 hover:bg-canopee-forest hover:shadow-xl focus-visible:ring-2 focus-visible:ring-canopee-lime focus-visible:outline-none active:translate-y-0 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      >
        {pending ? 'Démarrage…' : 'Démarrer'}
      </button>

      {message && (
        <p
          role="alert"
          className="rounded-full bg-canopee-cream/95 px-3 py-1 text-sm font-medium text-canopee-coral-dark shadow-md"
        >
          {message}
        </p>
      )}
    </div>
  )
}

const ROUND_BUTTON_BASE =
  'inline-flex h-10 w-10 touch-manipulation items-center justify-center rounded-full shadow-lg shadow-black/25 ring-1 ring-white/20 transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-xl focus-visible:ring-2 focus-visible:outline-none active:translate-y-0 active:scale-[0.95] motion-reduce:transition-none motion-reduce:hover:translate-y-0'

function PauseResumeButton({
  paused,
  onToggle,
}: {
  paused: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={
        paused ? 'Reprendre la patrouille' : 'Mettre la patrouille en pause'
      }
      className={`${ROUND_BUTTON_BASE} ${
        paused
          ? 'bg-canopee-green text-white hover:bg-canopee-forest focus-visible:ring-canopee-sky'
          : 'bg-canopee-sky text-canopee-forest hover:bg-canopee-sky-dark hover:text-white focus-visible:ring-canopee-sky'
      }`}
    >
      {paused ? (
        <PlayIcon className="h-5 w-5" />
      ) : (
        <PauseIcon className="h-5 w-5" />
      )}
    </button>
  )
}

function EndPatrolButton({
  flushAndStop,
  onError,
  onPatrolEnded,
}: {
  flushAndStop: () => Promise<void>
  onError: (message: string) => void
  onPatrolEnded?: (summary?: PatrolSummary) => void
}) {
  const [pending, startTransition] = useTransition()

  function handleClick() {
    onError('')

    startTransition(async () => {
      await flushAndStop()
      const result = await endPatrol()

      if (result.message) {
        onError(result.message)
        return
      }

      onPatrolEnded?.(result.summary)
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={`${ROUND_BUTTON_BASE} bg-canopee-coral text-white hover:bg-canopee-coral-dark focus-visible:ring-canopee-coral`}
    >
      <StopIcon className="h-5 w-5" />
    </button>
  )
}

function ActivePatrol({
  startedAt,
  onEnded,
}: {
  startedAt: string
  onEnded: (summary: PatrolSummary) => void
}) {
  const [pause, setPause] = useState<StoredPause>({
    paused: false,
    pausedAtMs: null,
  })
  const [endError, setEndError] = useState<string | null>(null)
  const { status, flushAndStop } = usePatrolRecorder({ paused: pause.paused })
  usePatrolExitWarning()

  const recordingNotice = pause.paused ? null : RECORDING_NOTICE[status]
  const notice = endError ?? recordingNotice

  useEffect(() => {
    const stored = readStoredPause(startedAt)
    const frame = requestAnimationFrame(() => setPause(stored))

    return () => cancelAnimationFrame(frame)
  }, [startedAt])

  function handleTogglePause() {
    const next = pause.paused
      ? { paused: false, pausedAtMs: null }
      : { paused: true, pausedAtMs: Date.now() }

    setPause(next)

    if (next.paused || next.pausedAtMs !== null) {
      writeStoredPause(startedAt, next)
    } else {
      clearStoredPause(startedAt)
    }
  }

  return (
    <div className="fixed bottom-28 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2">
      {notice && (
        <p
          role={endError ? 'alert' : 'status'}
          className="max-w-64 rounded-full bg-canopee-cream/90 px-3 py-1 text-xs font-medium text-canopee-forest shadow-md ring-1 ring-black/5 backdrop-blur-sm"
        >
          {notice}
        </p>
      )}

      <div
        className={`flex items-center gap-1.5 rounded-full p-1.5 pl-4 shadow-lg shadow-black/25 ring-1 ring-white/20 backdrop-blur-md transition-colors duration-200 ${
          pause.paused
            ? 'bg-canopee-sky/30 text-canopee-forest'
            : 'bg-canopee-forest/35 text-canopee-cream'
        }`}
      >
        <ActivePatrolStatus
          startedAt={startedAt}
          paused={pause.paused}
          pausedAtMs={pause.pausedAtMs}
        />

        <PauseResumeButton paused={pause.paused} onToggle={handleTogglePause} />

        <EndPatrolButton
          flushAndStop={flushAndStop}
          onError={setEndError}
          onPatrolEnded={(summary) => {
            clearStoredPause(startedAt)

            if (summary) {
              onEnded(summary)
            }
          }}
        />
      </div>
    </div>
  )
}

function ActivePatrolStatus({
  startedAt,
  paused,
  pausedAtMs,
}: {
  startedAt: string
  paused: boolean
  pausedAtMs: number | null
}) {
  const startedAtMs = new Date(startedAt).getTime()

  // Null on the server, a live timestamp in the browser.
  const now = useSyncExternalStore(subscribeToClock, getClock, getServerClock)

  // While paused the display freezes at the moment the pause began. The pause
  // itself still counts toward the patrol
  const elapsedMs =
    now === null
      ? null
      : Math.max(
          0,
          (paused && pausedAtMs !== null ? pausedAtMs : now) - startedAtMs,
        )

  return (
    <span className="flex items-center pl-1 pr-1">
      <time
        dateTime={startedAt}
        aria-label={
          paused
            ? 'Patrouille en pause'
            : 'Temps écoulé depuis le début de la patrouille'
        }
        className="font-mono text-sm font-semibold whitespace-nowrap tabular-nums"
      >
        {elapsedMs === null ? NO_READING_YET : formatElapsed(elapsedMs)}
      </time>
    </span>
  )
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  )
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  )
}
