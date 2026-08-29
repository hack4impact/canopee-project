'use client'

import { useCallback, useEffect, useState } from 'react'
import { drainQueuedReports, pendingReportCount } from '@/lib/reports/send'

export function PendingReportsNotice() {
  const [pending, setPending] = useState(0)

  const drain = useCallback(() => {
    drainQueuedReports()
      .then(setPending)
      .catch(() => setPending(0))
  }, [])

  useEffect(() => {
    pendingReportCount()
      .then(setPending)
      .catch(() => setPending(0))

    drain()

    window.addEventListener('online', drain)

    return () => window.removeEventListener('online', drain)
  }, [drain])

  if (pending === 0) {
    return null
  }

  return (
    <p
      role="status"
      className="flex items-center gap-2 rounded-xl bg-canopee-coral px-3 py-2 text-xs font-bold text-white"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4 shrink-0"
        aria-hidden="true"
      >
        <path d="M12 19V5" />
        <path d="m5 12 7-7 7 7" />
      </svg>
      {pending === 1
        ? '1 signalement en attente d’envoi'
        : `${pending} signalements en attente d’envoi`}
    </p>
  )
}
