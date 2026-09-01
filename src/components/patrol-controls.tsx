'use client'

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useRouter } from 'next/navigation'
import { endPatrol, type PatrolSummary } from '@/app/patrouilles/actions'
import { usePatrol } from '@/components/patrol-provider'
import {
  endLiveActivity,
  listenForActivityCommands,
  startLiveActivity,
  updateLiveActivity,
} from '@/lib/patrols/live-activity'
import { isPublicRoute } from '@/lib/auth/routes'
import { formatElapsed } from '@/lib/patrols/elapsed'
import { usePatrolExitWarning } from '@/lib/patrols/use-patrol-exit-warning'
import {
  usePatrolRecorder,
  type RecordingStatus,
} from '@/lib/patrols/use-patrol-recorder'

const REPORT_ROUTE = '/signaler'

function isReportRoute(pathname: string): boolean {
  return pathname === REPORT_ROUTE || pathname.startsWith(`${REPORT_ROUTE}/`)
}

const HOME_ROUTE = '/carte'

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

export function PatrolControls() {
  const router = useRouter()
  const pathname = usePathname()
  const { state, refresh, dock } = usePatrol()

  // Auth pages must never show the controls, even when a session is active.
  if (isPublicRoute(pathname)) {
    return null
  }

  if (state.status !== 'active') {
    return null
  }

  const shell = (
    <ActivePatrol
      docked={dock !== null}
      startedAt={state.startedAt}
      patrolId={state.id}
      hidden={isReportRoute(pathname)}
      onEnded={(summary) => {
        void refresh()
        router.push(`/patrouilles/${summary.id}?from=patrouille`)
      }}
    />
  )

  // The bottom nav owns the slot wherever it is mounted. Pages without a nav
  // (the admin screens) keep the floating shell so recording is never lost.
  return dock ? createPortal(shell, dock) : shell
}

const SHELL_BASE =
  'flex items-center shadow-lg shadow-black/25 ring-1 ring-white/20 backdrop-blur-md transition-all duration-300 ease-out motion-reduce:transition-none'

const ROUND_BUTTON_BASE =
  'inline-flex h-14 w-14 touch-manipulation items-center justify-center rounded-2xl ring-1 ring-white/25 transition-all duration-150 ease-out hover:-translate-y-0.5 hover:ring-white/40 focus-visible:ring-2 focus-visible:outline-none active:translate-y-0 active:scale-[0.95] motion-reduce:transition-none motion-reduce:hover:translate-y-0'

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
        <PlayIcon className="h-7 w-7" />
      ) : (
        <PauseIcon className="h-7 w-7" />
      )}
    </button>
  )
}

async function runEndPatrol(flushAndStop: () => Promise<void>) {
  await flushAndStop()
  return endPatrol()
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
      const result = await runEndPatrol(flushAndStop)

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
      <StopIcon className="h-7 w-7" />
    </button>
  )
}

function ActivePatrol({
  docked,
  startedAt,
  patrolId,
  hidden,
  onEnded,
}: {
  docked: boolean
  startedAt: string
  patrolId: string | null
  hidden: boolean
  onEnded: (summary: PatrolSummary) => void
}) {
  const [pause, setPause] = useState<StoredPause>({
    paused: false,
    pausedAtMs: null,
  })
  const [endError, setEndError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const { status, flushAndStop, getDistanceMetres, getRoute, seedRoute } =
    usePatrolRecorder({ paused: pause.paused })
  usePatrolExitWarning()

  const startedAtMs = new Date(startedAt).getTime()
  const commandRef = useRef<(command: 'toggle' | 'stop') => void>(() => {})

  const isHome = usePathname() === HOME_ROUTE
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

  useEffect(() => {
    commandRef.current = (command) => {
      if (command === 'toggle') {
        handleTogglePause()
        return
      }

      void runEndPatrol(flushAndStop).then((result) => {
        if (result.message) {
          setEndError(result.message)
          return
        }

        onEnded(result.summary as PatrolSummary)
      })
    }
  })

  useEffect(() => {
    if (!patrolId) {
      return
    }

    let cancelled = false

    void (async () => {
      try {
        const response = await fetch(`/api/patrols/${patrolId}/points`, {
          redirect: 'manual',
        })

        if (!response.ok || cancelled) {
          return
        }

        const payload = (await response.json()) as {
          points: { latitude: number; longitude: number }[]
        }

        seedRoute(payload.points)
      } catch {
        return
      }
    })()

    return () => {
      cancelled = true
    }
  }, [patrolId, seedRoute])

  useEffect(() => {
    function begin() {
      void startLiveActivity({
        startedAt: startedAtMs,
        distanceMetres: getDistanceMetres(),
        paused: false,
        elapsedSeconds: 0,
        route: getRoute(),
      })
    }

    begin()

    function restartWhenVisible() {
      if (document.visibilityState === 'visible') {
        begin()
      }
    }

    document.addEventListener('visibilitychange', restartWhenVisible)

    return () => {
      document.removeEventListener('visibilitychange', restartWhenVisible)
      void endLiveActivity()
    }
  }, [startedAtMs, getDistanceMetres, getRoute])

  useEffect(() => {
    void updateLiveActivity({
      distanceMetres: getDistanceMetres(),
      paused: pause.paused,
      elapsedSeconds:
        pause.paused && pause.pausedAtMs !== null
          ? Math.round((pause.pausedAtMs - startedAtMs) / 1000)
          : 0,
      route: getRoute(),
    })
  }, [pause, startedAtMs, getDistanceMetres, getRoute])

  useEffect(() => {
    let remove: (() => void) | null = null

    void listenForActivityCommands((command) =>
      commandRef.current(command),
    ).then((off) => {
      remove = off
    })

    return () => remove?.()
  }, [])

  if (hidden) {
    return null
  }

  const shellTint = pause.paused
    ? 'bg-canopee-cream/90 text-canopee-forest'
    : 'bg-canopee-forest/90 text-canopee-cream'

  // Docked in the nav the shell always starts collapsed, so the bar is not
  // permanently 120px tall on the map.
  const showControls = (!docked && isHome) || expanded

  const timestamp = (
    <ActivePatrolStatus
      startedAt={startedAt}
      paused={pause.paused}
      pausedAtMs={pause.pausedAtMs}
    />
  )

  return (
    <div
      className={
        docked
          ? 'flex animate-dock-in flex-col items-center gap-2'
          : 'fixed bottom-[calc(7rem+env(safe-area-inset-bottom))] left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2'
      }
    >
      {showControls && notice && (
        <p
          role={endError ? 'alert' : 'status'}
          className="max-w-64 rounded-full bg-canopee-cream/90 px-3 py-1 text-xs font-medium text-canopee-forest shadow-md ring-1 ring-black/5 backdrop-blur-sm"
        >
          {notice}
        </p>
      )}

      <div
        className={`${SHELL_BASE} flex-col ${shellTint} ${
          showControls ? 'rounded-3xl px-4 pt-2.5 pb-3' : 'rounded-2xl p-1.5'
        }`}
      >
        {!docked && isHome ? (
          timestamp
        ) : (
          <button
            type="button"
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
            aria-label={
              expanded
                ? 'Masquer les commandes de la patrouille'
                : 'Afficher les commandes de la patrouille'
            }
            className="touch-manipulation rounded-xl transition-transform duration-150 ease-out active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-canopee-lime focus-visible:outline-none motion-reduce:transition-none"
          >
            {timestamp}
          </button>
        )}

        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
            showControls
              ? 'grid-rows-[1fr] opacity-100'
              : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden">
            <div className="flex items-center justify-center gap-3 pt-2.5">
              <PauseResumeButton
                paused={pause.paused}
                onToggle={handleTogglePause}
              />

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
        </div>
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
    <span
      className={`flex items-center justify-center rounded-xl px-3.5 py-1.5 ring-1 ring-inset transition-colors duration-200 ${
        paused ? 'bg-black/10 ring-black/10' : 'bg-black/20 ring-white/10'
      }`}
    >
      <time
        dateTime={startedAt}
        aria-label={
          paused
            ? 'Patrouille en pause'
            : 'Temps écoulé depuis le début de la patrouille'
        }
        className="font-heading text-2xl leading-none font-bold whitespace-nowrap tabular-nums"
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
