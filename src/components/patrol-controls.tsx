'use client'

import { useEffect, useState, useSyncExternalStore, useTransition } from 'react'
import { endPatrol, startPatrol } from '@/app/carte/actions'
import { formatElapsed } from '@/lib/patrols/elapsed'
import { usePatrolExitWarning } from '@/lib/patrols/use-patrol-exit-warning'
import {
  usePatrolRecorder,
  type RecordingStatus,
} from '@/lib/patrols/use-patrol-recorder'

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

type PatrolControlsProps = {
  /** ISO string, not a Date, because it crosses the server/client boundary. */
  startedAt: string | null
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

export function PatrolControls({ startedAt }: PatrolControlsProps) {
  if (startedAt) {
    return <ActivePatrol startedAt={startedAt} />
  }

  return <StartPatrolButton />
}

function StartPatrolButton() {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  function handleClick() {
    setMessage(null)

    startTransition(async () => {
      const result = await startPatrol()
      setMessage(result.message ?? null)
    })
  }

  return (
    <div className="absolute bottom-28 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="inline-flex touch-manipulation items-center justify-center rounded-full bg-canopee-green px-8 py-4 text-base font-bold tracking-wide text-white shadow-xl shadow-black/30 ring-1 ring-white/25 transition-all duration-150 ease-out hover:-translate-y-0.5 hover:bg-canopee-forest hover:shadow-2xl focus-visible:ring-2 focus-visible:ring-canopee-lime focus-visible:outline-none active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      >
        {pending ? 'Démarrage…' : 'Démarrer la patrouille'}
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
  'inline-flex h-14 w-14 touch-manipulation items-center justify-center rounded-full text-white shadow-xl shadow-black/30 ring-1 ring-white/25 transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-2xl focus-visible:ring-2 focus-visible:outline-none active:translate-y-0 active:scale-[0.95] motion-reduce:transition-none motion-reduce:hover:translate-y-0'

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
          ? 'bg-canopee-green hover:bg-canopee-forest focus-visible:ring-canopee-sky'
          : 'bg-canopee-sky text-canopee-forest hover:bg-canopee-sky-dark hover:text-white focus-visible:ring-canopee-sky'
      }`}
    >
      {paused ? (
        <PlayIcon className="h-6 w-6" />
      ) : (
        <PauseIcon className="h-6 w-6" />
      )}
    </button>
  )
}

function EndPatrolButton({
  flushAndStop,
  onPatrolEnded,
}: {
  flushAndStop: () => Promise<void>
  onPatrolEnded?: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  function handleClick() {
    setMessage(null)

    startTransition(async () => {
      await flushAndStop()
      const result = await endPatrol()
      setMessage(result.message ?? null)

      if (!result.message) {
        onPatrolEnded?.()
      }
    })
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={`${ROUND_BUTTON_BASE} bg-canopee-coral hover:bg-canopee-coral-dark focus-visible:ring-canopee-coral`}
      >
        <StopIcon className="h-6 w-6" />
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

function ActivePatrol({ startedAt }: { startedAt: string }) {
  const [pause, setPause] = useState<StoredPause>({
    paused: false,
    pausedAtMs: null,
  })
  const { status, flushAndStop } = usePatrolRecorder({ paused: pause.paused })
  usePatrolExitWarning()

  const notice = pause.paused ? null : RECORDING_NOTICE[status]

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
    <>
      <div className="absolute top-4 left-4 z-10 flex flex-col items-start gap-2">
        <ActivePatrolStatus
          startedAt={startedAt}
          paused={pause.paused}
          pausedAtMs={pause.pausedAtMs}
        />

        {notice &&
          (status === 'waiting' ? (
            <p role="status" className="text-sm font-medium text-canopee-green">
              {notice}
            </p>
          ) : (
            <p
              role="status"
              className="max-w-72 rounded-full bg-canopee-forest/80 px-3 py-1.5 text-sm text-zinc-100 shadow-md ring-1 ring-white/10 backdrop-blur-sm"
            >
              {notice}
            </p>
          ))}
      </div>

      <div className="absolute bottom-28 left-1/2 z-10 flex -translate-x-1/2 items-center gap-4 rounded-full bg-canopee-forest/30 p-3 shadow-xl shadow-black/30 ring-1 ring-white/10 backdrop-blur-sm">
        <PauseResumeButton paused={pause.paused} onToggle={handleTogglePause} />
        <EndPatrolButton
          flushAndStop={flushAndStop}
          onPatrolEnded={() => clearStoredPause(startedAt)}
        />
      </div>
    </>
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
    <div
      className={`flex items-baseline gap-2 rounded-full px-4 py-2 text-canopee-cream shadow-xl shadow-black/30 ring-1 ring-white/10 backdrop-blur-sm ${
        paused ? 'bg-canopee-sky-dark/80' : 'bg-canopee-forest/80'
      }`}
    >
      <span role="status" className="text-sm font-semibold">
        {paused ? 'Patrouille en pause' : 'Patrouille en cours'}
      </span>

      {/* Outside the live region above: announcing every tick would make a
          screen reader unusable. */}
      {!paused && (
        <time
          dateTime={startedAt}
          aria-label="Temps écoulé depuis le début de la patrouille"
          className="font-mono text-sm font-medium tabular-nums"
        >
          {elapsedMs === null ? NO_READING_YET : formatElapsed(elapsedMs)}
        </time>
      )}
    </div>
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
