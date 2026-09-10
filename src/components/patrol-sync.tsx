'use client'

import { useEffect } from 'react'
import { flushNativeQueue } from '@/lib/patrols/native'

export function PatrolSync() {
  useEffect(() => {
    void flushNativeQueue()
  }, [])

  return null
}
