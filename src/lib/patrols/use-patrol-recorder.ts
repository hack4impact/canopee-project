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
  isNativeApp,
  startNativeWatch,
  stopNativeWatch,
} from '@/lib/patrols/native'
import {
  appendPoint,
  clearPoints,
  deletePoints,
  isPointQueueAvailable,
  readBatch,
} from '@/lib/patrols/point-queue'
import {
  classifySyncResponse,
  describeSignalGap,
  isPermissionDenied,
  MAX_BATCH_POINTS,
  shouldRecordPoint,
  SYNC_INTERVAL_MS,
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

function isRecordingSupported(): boolean {
  return isGeolocationAvailable() && isPointQueueAvailable()
}

export type RecordingStatus =
  'unsupported' | 'waiting' | 'recording' | 'signal-lost' | 'denied' | 'stopped'

export type PatrolRecorder = {
  status: RecordingStatus
  /** Stops recording and delivers every queued point; awaited before ending. */
  flushAndStop: () => Promise<void>
}

/**
 * Records the patroller's position and syncs it in batches, for as long as it is
 * mounted. Mounting is the on/off switch, so there is no flag to keep in step
 * with the server's view of the patrol.
 */
export function usePatrolRecorder({
  paused = false,
}: { paused?: boolean } = {}): PatrolRecorder {
  const [status, setStatus] = useState<RecordingStatus>('waiting')

  const flushAndStopRef = useRef<() => Promise<void>>(() => Promise.resolve())

  // A store rather than state: the server has no `navigator`, and setting this
  // from the effect would cost a second render on every patrol.
  const isSupported = useSyncExternalStore(
    subscribeToSupport,
    isRecordingSupported,
    isSupportedOnServer,
  )

  // Refs, not state: a new point every twelve seconds must not re-render the
  // page, and the callbacks below must always see the current values.
  const lastRecordedAtRef = useRef<number | null>(null)
  const lastDrainedAtRef = useRef<number>(0)

  useEffect(() => {
    if (!isSupported) {
      return
    }

    let syncing = false
    let stopped = false
    let native = false
    let watchId: number | null = null
    let syncTimer: ReturnType<typeof setInterval> | null = null

    function releaseWatch() {
      if (native) {
        native = false
        void stopNativeWatch()
      }

      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId)
        watchId = null
      }

      if (syncTimer !== null) {
        clearInterval(syncTimer)
        syncTimer = null
      }
    }

    function stop(reason: RecordingStatus) {
      stopped = true
      releaseWatch()
      setStatus(reason)
    }

    async function drain() {
      if (stopped || syncing) {
        return
      }

      syncing = true

      try {
        while (!stopped) {
          const queued = await readBatch(MAX_BATCH_POINTS)

          if (queued.length === 0) {
            return
          }

          const response = await fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(queued.map((entry) => entry.point)),
            redirect: 'manual',
          })

          const outcome = classifySyncResponse(response.status)

          if (outcome === 'accepted') {
            await deletePoints(queued.map((entry) => entry.key))
            lastDrainedAtRef.current = Date.now()
            continue
          }

          if (outcome === 'fatal') {
            await clearPoints()

            console.warn(
              response.status === 0
                ? 'Patrol point sync rejected: the session is no longer valid'
                : `Patrol point sync refused (${response.status})`,
            )

            stop('stopped')
            return
          }

          console.warn(
            `Patrol point sync failed (${response.status}), keeping the queue`,
          )

          return
        }
      } catch (cause) {
        console.warn('Patrol point sync failed, keeping the queue', cause)
      } finally {
        syncing = false
      }
    }

    async function record(point: RecordedPoint) {
      if (stopped) {
        return
      }

      setStatus('recording')

      const recordedAtMs = Date.parse(point.recordedAt)

      if (!shouldRecordPoint(lastRecordedAtRef.current, recordedAtMs)) {
        return
      }

      lastRecordedAtRef.current = recordedAtMs

      await appendPoint(point)

      if (Date.now() - lastDrainedAtRef.current >= SYNC_INTERVAL_MS) {
        await drain()
      }
    }

    function handleFix(position: GeolocationPosition) {
      void record(toRecordedPoint(position))
    }

    function handleSignalLoss(reason: string) {
      console.warn(
        `${reason}, ${describeSignalGap(lastRecordedAtRef.current, Date.now())}`,
      )

      setStatus('signal-lost')
    }

    function handleError(error: GeolocationPositionError) {
      if (isPermissionDenied(error)) {
        stop('denied')
        return
      }

      handleSignalLoss(`GPS signal lost (code ${error.code})`)
    }

    async function flushAndStop() {
      stopped = true
      releaseWatch()

      while (true) {
        const queued = await readBatch(MAX_BATCH_POINTS)

        if (queued.length === 0) {
          return
        }

        try {
          const response = await fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(queued.map((entry) => entry.point)),
            redirect: 'manual',
          })

          if (classifySyncResponse(response.status) !== 'accepted') {
            return
          }
        } catch {
          return
        }

        await deletePoints(queued.map((entry) => entry.key))
      }
    }

    if (!paused) {
      if (isNativeApp()) {
        native = true

        startNativeWatch(
          (point) => void record(point),
          (error) => handleSignalLoss(`GPS signal lost (${error.message})`),
        ).catch(() => stop('denied'))
      } else {
        watchId = navigator.geolocation.watchPosition(
          handleFix,
          handleError,
          WATCH_OPTIONS,
        )
      }

      syncTimer = setInterval(() => void drain(), SYNC_INTERVAL_MS)
    }

    flushAndStopRef.current = flushAndStop

    void drain()

    return () => {
      flushAndStopRef.current = () => Promise.resolve()

      stopped = true
      releaseWatch()

      lastRecordedAtRef.current = null
    }
  }, [isSupported, paused])

  const flushAndStop = useCallback(() => flushAndStopRef.current(), [])

  return {
    status: isSupported ? status : 'unsupported',
    flushAndStop,
  }
}
