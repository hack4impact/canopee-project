'use client'

import { useState, useSyncExternalStore, useTransition } from 'react'
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

/**
 * A shared clock, read through `useSyncExternalStore` for its server snapshot:
 * SSR renders a placeholder rather than a duration that cannot survive
 * hydration. Module level, so one timer serves every badge.
 */
let clockNow = Date.now()
let clockTimer: ReturnType<typeof setInterval> | null = null
const clockSubscribers = new Set<() => void>()

function subscribeToClock(onChange: () => void): () => void {
  clockSubscribers.add(onChange)

  // React re-reads the snapshot right after subscribing.
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
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="inline-flex touch-manipulation items-center justify-center gap-2 rounded-lg bg-canopee-green px-4 py-2.5 text-sm font-bold text-white shadow-lg ring-1 ring-black/5 transition-[background-color,transform] duration-150 ease-out hover:bg-canopee-forest focus-visible:ring-2 focus-visible:ring-canopee-green/50 focus-visible:outline-none active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        {pending ? 'Démarrage…' : 'Démarrer la patrouille'}
      </button>

      {message && (
        <p
          role="alert"
          className="rounded bg-canopee-cream/95 px-2 py-1 text-sm font-medium text-canopee-coral-dark shadow-sm"
        >
          {message}
        </p>
      )}
    </div>
  )
}

function EndPatrolButton({
  flushAndStop,
}: {
  flushAndStop: () => Promise<void>
}) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  function handleClick() {
    setMessage(null)

    startTransition(async () => {
      await flushAndStop()
      const result = await endPatrol()
      setMessage(result.message ?? null)
    })
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="inline-flex touch-manipulation items-center justify-center gap-2 rounded-lg bg-canopee-coral px-4 py-2.5 text-sm font-bold text-white shadow-lg ring-1 ring-black/5 transition-[background-color,transform] duration-150 ease-out hover:bg-canopee-coral-dark focus-visible:ring-2 focus-visible:ring-canopee-coral/50 focus-visible:outline-none active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        {pending ? 'Patrouille finie' : 'Terminer la patrouille'}
      </button>

      {message && (
        <p
          role="alert"
          className="rounded bg-canopee-cream/95 px-2 py-1 text-sm font-medium text-canopee-coral-dark shadow-sm"
        >
          {message}
        </p>
      )}
    </div>
  )
}

/** Mounted only while a patrol runs, so recording lasts exactly that long. */
function ActivePatrol({ startedAt }: { startedAt: string }) {
  const { status, flushAndStop } = usePatrolRecorder()
  usePatrolExitWarning()

  const notice = RECORDING_NOTICE[status]

  return (
    <div className="flex flex-col items-start gap-1.5">
      <EndPatrolButton flushAndStop={flushAndStop} />
      <ActivePatrolStatus startedAt={startedAt} />

      {notice && (
        <p
          role="status"
          className={
            status === 'waiting'
              ? 'text-sm text-zinc-600 dark:text-zinc-400'
              : status === 'denied'
                ? 'text-sm font-medium text-canopee-coral-dark'
                : 'text-sm text-amber-700 dark:text-amber-400'
          }
        >
          {notice}
        </p>
      )}
    </div>
  )
}

function ActivePatrolStatus({ startedAt }: { startedAt: string }) {
  const startedAtMs = new Date(startedAt).getTime()

  // Null on the server, a live timestamp in the browser.
  const now = useSyncExternalStore(subscribeToClock, getClock, getServerClock)

  return (
    <div className="flex items-baseline gap-2 text-canopee-forest [text-shadow:0_1px_3px_rgba(246,244,223,0.95)]">
      <span role="status" className="text-sm font-semibold">
        Patrouille en cours
      </span>

      {/* Outside the live region above: announcing every tick would make a
          screen reader unusable. */}
      <time
        dateTime={startedAt}
        aria-label="Temps écoulé depuis le début de la patrouille"
        className="font-mono text-sm tabular-nums"
      >
        {now === null ? NO_READING_YET : formatElapsed(now - startedAtMs)}
      </time>
    </div>
  )
}
