'use client'

import { useState, useSyncExternalStore, useTransition } from 'react'
import { startPatrol } from '@/app/carte/actions'
import { formatElapsed } from '@/lib/patrols/elapsed'

const TICK_MS = 1000
const NO_READING_YET = '--:--:--'

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
    return <ActivePatrolBadge startedAt={startedAt} />
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
        className="rounded bg-black px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50 dark:bg-zinc-50 dark:text-black"
      >
        {pending ? 'Démarrage…' : 'Démarrer la patrouille'}
      </button>

      {message && (
        <p role="alert" className="text-sm text-red-600">
          {message}
        </p>
      )}
    </div>
  )
}

function ActivePatrolBadge({ startedAt }: { startedAt: string }) {
  const startedAtMs = new Date(startedAt).getTime()

  // Null on the server, a live timestamp in the browser.
  const now = useSyncExternalStore(subscribeToClock, getClock, getServerClock)

  return (
    <div className="flex items-center gap-3 self-start rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 dark:border-emerald-800 dark:bg-emerald-950">
      <span
        aria-hidden="true"
        className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-emerald-600 dark:bg-emerald-400"
      />

      <p
        role="status"
        className="text-sm font-medium text-emerald-900 dark:text-emerald-100"
      >
        Patrouille en cours
      </p>

      {/* Outside the live region above: announcing every tick would make a
          screen reader unusable. */}
      <time
        dateTime={startedAt}
        aria-label="Temps écoulé depuis le début de la patrouille"
        className="font-mono text-sm tabular-nums text-emerald-900 dark:text-emerald-100"
      >
        {now === null ? NO_READING_YET : formatElapsed(now - startedAtMs)}
      </time>
    </div>
  )
}
