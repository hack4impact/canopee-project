'use client'

import { useEffect } from 'react'

/** Makes the browser confirm before the page is closed or reloaded. */
export function usePatrolExitWarning(): void {
  useEffect(() => {
    function confirmExit(event: BeforeUnloadEvent) {
      event.preventDefault()
    }

    window.addEventListener('beforeunload', confirmExit)

    return () => window.removeEventListener('beforeunload', confirmExit)
  }, [])
}
