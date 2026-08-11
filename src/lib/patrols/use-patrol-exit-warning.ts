'use client'

import { useEffect } from 'react'

/**
 * Makes the browser confirm before the page is closed or reloaded. The wording
 * is the browser's own, and nothing is asked until the patroller has interacted
 * with the page. Client-side navigation does not fire this at all, which is what
 * `LeavePatrolLink` covers.
 */
export function usePatrolExitWarning(): void {
  useEffect(() => {
    function confirmExit(event: BeforeUnloadEvent) {
      event.preventDefault()
    }

    window.addEventListener('beforeunload', confirmExit)

    return () => window.removeEventListener('beforeunload', confirmExit)
  }, [])
}
