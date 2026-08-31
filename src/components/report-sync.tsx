'use client'

import { useEffect } from 'react'
import { drainQueuedReports } from '@/lib/reports/send'

export function ReportSync() {
  useEffect(() => {
    function drain() {
      void drainQueuedReports().catch(() => {})
    }

    drain()

    window.addEventListener('online', drain)

    return () => window.removeEventListener('online', drain)
  }, [])

  return null
}
