'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { isGeolocationAvailable } from '@/lib/mapbox'
import {
  capBuffer,
  describeSignalGap,
  isPermissionDenied,
  shouldRecordPoint,
  SYNC_INTERVAL_MS,
  takeBatch,
  toRecordedPoint,
  type RecordedPoint,
} from '@/lib/patrols/points'

const ENDPOINT = '/api/patrol-points'

const WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  // Generous, because walking under tree cover is normal here, not a failure.
  timeout: 30_000,
}

function subscribeToSupport(): () => void {
  return () => {}
}

function isSupportedOnServer(): boolean {
  return true
}

export type RecordingStatus =
  'unsupported' | 'waiting' | 'recording' | 'signal-lost' | 'denied' | 'stopped'

export type PatrolRecorder = {
  status: RecordingStatus
  /** Stops recording and delivers every buffered point; awaited before ending. */
  flushAndStop: () => Promise<void>
}

/**
 * Records the patroller's position and syncs it in batches, for as long as it is
 * mounted. Mounting is the on/off switch, so there is no flag to keep in step
 * with the server's view of the patrol.
 */
export function usePatrolRecorder(): PatrolRecorder {
  const [status, setStatus] = useState<RecordingStatus>('waiting')

  const flushAndStopRef = useRef<() => Promise<void>>(() => Promise.resolve())

  // A store rather than state: the server has no `navigator`, and setting this
  // from the effect would cost a second render on every patrol.
  const isSupported = useSyncExternalStore(
    subscribeToSupport,
    isGeolocationAvailable,
    isSupportedOnServer,
  )

  // Refs, not state: a new point every twelve seconds must not re-render the
  // page, and the callbacks below must always see the current buffer.
  const bufferRef = useRef<RecordedPoint[]>([])
  const lastRecordedAtRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isSupported) {
      return
    }

    let syncing = false
    let stopped = false
    let watchId: number | null = null
    let syncTimer: ReturnType<typeof setInterval> | null = null

    function stop(reason: RecordingStatus) {
      stopped = true

      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId)
        watchId = null
      }

      if (syncTimer !== null) {
        clearInterval(syncTimer)
        syncTimer = null
      }

      setStatus(reason)
    }

    async function flush() {
      if (stopped || syncing || bufferRef.current.length === 0) {
        return
      }

      const batch = takeBatch(bufferRef.current)
      syncing = true

      try {
        const response = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batch),
          // An expired session makes the proxy answer 307 to /login. Followed,
          // that lands on a 200 page and looks like a successful sync, dropping
          // the buffer without anything being stored.
          redirect: 'manual',
        })

        if (response.ok) {
          // Re-read rather than reuse the snapshot above: a slow request can
          // outlast the point interval, and those new points must survive.
          bufferRef.current = bufferRef.current.slice(batch.length)
          return
        }

        // Status 0 is the unfollowed redirect above. Both it and a 4xx are
        // permanent, so retrying either is a loop.
        if (response.status < 500) {
          bufferRef.current = []

          console.warn(
            response.status === 0
              ? 'Patrol point sync rejected: the session is no longer valid'
              : `Patrol point sync refused (${response.status})`,
          )

          stop('stopped')
          return
        }

        // 5xx and network failures keep the buffer for the next tick.
        console.warn(`Patrol point sync failed (${response.status}), retrying`)
      } catch (cause) {
        console.warn('Patrol point sync failed, keeping the buffer', cause)
      } finally {
        syncing = false
      }
    }

    /** The page is going away, so the request has to outlive it. */
    function flushBeforeUnload() {
      if (stopped || syncing || bufferRef.current.length === 0) {
        return
      }

      const batch = takeBatch(bufferRef.current)
      const body = new Blob([JSON.stringify(batch)], {
        type: 'application/json',
      })

      if (navigator.sendBeacon(ENDPOINT, body)) {
        bufferRef.current = bufferRef.current.slice(batch.length)
      }
    }

    /** Ends recording and delivers whatever is buffered, batch by batch. */
    async function flushAndStop() {
      stopped = true

      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId)
        watchId = null
      }

      if (syncTimer !== null) {
        clearInterval(syncTimer)
        syncTimer = null
      }

      while (bufferRef.current.length > 0) {
        const batch = takeBatch(bufferRef.current)

        try {
          const response = await fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(batch),
            redirect: 'manual',
          })

          if (!response.ok) {
            break
          }
        } catch {
          break
        }

        bufferRef.current = bufferRef.current.slice(batch.length)
      }
    }

    function handleFix(position: GeolocationPosition) {
      if (stopped) {
        return
      }

      setStatus('recording')

      if (!shouldRecordPoint(lastRecordedAtRef.current, position.timestamp)) {
        return
      }

      lastRecordedAtRef.current = position.timestamp
      bufferRef.current = capBuffer([
        ...bufferRef.current,
        toRecordedPoint(position),
      ])
    }

    function handleError(error: GeolocationPositionError) {
      if (isPermissionDenied(error)) {
        stop('denied')
        return
      }

      // The watch is left running: the browser keeps trying, and `handleFix`
      // runs again on its own once a fix returns
      console.warn(
        `GPS signal lost (code ${error.code}), ${describeSignalGap(
          lastRecordedAtRef.current,
          Date.now(),
        )}`,
      )

      setStatus('signal-lost')
    }

    watchId = navigator.geolocation.watchPosition(
      handleFix,
      handleError,
      WATCH_OPTIONS,
    )

    syncTimer = setInterval(() => void flush(), SYNC_INTERVAL_MS)
    flushAndStopRef.current = flushAndStop

    // `pagehide` rather than `beforeunload`: mobile browsers fire it reliably,
    // including when the tab is frozen instead of closed.
    window.addEventListener('pagehide', flushBeforeUnload)

    return () => {
      window.removeEventListener('pagehide', flushBeforeUnload)
      flushAndStopRef.current = () => Promise.resolve()

      // A client-side navigation runs this instead of `pagehide`, and the patrol
      // is still open, so the last points can still be delivered.
      flushBeforeUnload()

      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId)
      }

      if (syncTimer !== null) {
        clearInterval(syncTimer)
      }

      lastRecordedAtRef.current = null
    }
  }, [isSupported])

  const flushAndStop = useCallback(() => flushAndStopRef.current(), [])

  return {
    status: isSupported ? status : 'unsupported',
    flushAndStop,
  }
}
