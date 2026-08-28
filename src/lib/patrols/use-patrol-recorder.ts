'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { isGeolocationAvailable } from '@/lib/mapbox'
import { distanceBetweenMetres } from '@/lib/patrols/distance'
import {
  debugLog,
  describeError,
  dumpDebugEvents,
  flushDebugFile,
  installDebugBridge,
  startDebugFile,
} from '@/lib/patrols/debug'
import { updateLiveActivity } from '@/lib/patrols/live-activity'
import {
  isNativeApp,
  startNativeWatch,
  stopNativeWatch,
} from '@/lib/patrols/native'
import {
  appendPoint,
  clearPoints,
  countPoints,
  deletePoints,
  isPointQueueAvailable,
  readBatch,
} from '@/lib/patrols/point-queue'
import {
  classifySyncResponse,
  describeSignalGap,
  isAccurateEnough,
  isPermissionDenied,
  isPlausibleStep,
  MAX_BATCH_POINTS,
  shouldRecordPoint,
  SYNC_INTERVAL_MS,
  toRecordedPoint,
  type RecordedPoint,
} from '@/lib/patrols/points'

const ENDPOINT = '/api/patrol-points'

const HEARTBEAT_MS = 30_000

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
  /** Metres walked so far, for the lock screen card. */
  getDistanceMetres: () => number
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
  const lastAcceptedRef = useRef<RecordedPoint | null>(null)
  const lastDrainedAtRef = useRef<number>(0)
  const distanceMetresRef = useRef<number>(0)

  const getDistanceMetres = useCallback(
    () => Math.round(distanceMetresRef.current),
    [],
  )

  useEffect(() => {
    if (!isSupported) {
      debugLog('recorder.unsupported', {
        geolocation: isGeolocationAvailable(),
        queue: isPointQueueAvailable(),
      })

      return
    }

    let syncing = false
    let stopped = false
    let native = false
    let stored = 0
    let watchId: number | null = null
    let syncTimer: ReturnType<typeof setInterval> | null = null
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null

    installDebugBridge()

    void startDebugFile()

    debugLog('recorder.mounted', {
      paused,
      nativePlatform: isNativeApp(),
      userAgent:
        typeof navigator === 'undefined'
          ? null
          : navigator.userAgent.slice(0, 120),
    })

    void dumpDebugEvents().catch(() => {})

    function onVisibilityChange() {
      debugLog('page.visibility', {
        state: document.visibilityState,
        stored,
      })

      void flushDebugFile()
    }

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

      if (heartbeatTimer !== null) {
        clearInterval(heartbeatTimer)
        heartbeatTimer = null
      }
    }

    function stop(reason: RecordingStatus) {
      debugLog('recorder.stop', { reason, stored })

      stopped = true
      releaseWatch()
      setStatus(reason)
    }

    async function drain() {
      if (stopped || syncing) {
        debugLog('drain.skipped', { stopped, syncing })
        return
      }

      syncing = true

      const startedAt = Date.now()

      try {
        while (!stopped) {
          const queued = await readBatch(MAX_BATCH_POINTS)

          if (queued.length === 0) {
            debugLog('drain.empty')
            return
          }

          debugLog('drain.posting', { batch: queued.length })

          const response = await fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(queued.map((entry) => entry.point)),
            redirect: 'manual',
          })

          const outcome = classifySyncResponse(response.status)

          debugLog('drain.response', {
            status: response.status,
            outcome,
            batch: queued.length,
            elapsedMs: Date.now() - startedAt,
          })

          if (outcome === 'accepted') {
            await deletePoints(queued.map((entry) => entry.key))
            lastDrainedAtRef.current = Date.now()

            debugLog('drain.accepted', {
              delivered: queued.length,
              remaining: await countPoints(),
            })

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
        debugLog('drain.threw', {
          ...describeError(cause),
          elapsedMs: Date.now() - startedAt,
        })

        console.warn('Patrol point sync failed, keeping the queue', cause)
      } finally {
        syncing = false
      }
    }

    async function storePoint(point: RecordedPoint): Promise<number | null> {
      try {
        return await appendPoint(point)
      } catch (cause) {
        debugLog('point.store.failed', {
          ...describeError(cause),
          recordedAt: point.recordedAt,
        })
      }

      try {
        const depth = await appendPoint(point)

        debugLog('point.store.retried', { depth })

        return depth
      } catch (cause) {
        debugLog('point.store.lost', {
          ...describeError(cause),
          recordedAt: point.recordedAt,
        })

        return null
      }
    }

    async function record(point: RecordedPoint, accuracy: number | null) {
      if (stopped) {
        debugLog('record.ignored.stopped')
        return
      }

      setStatus('recording')

      const recordedAtMs = Date.parse(point.recordedAt)

      if (!shouldRecordPoint(lastRecordedAtRef.current, recordedAtMs)) {
        debugLog('record.throttled', {
          sinceLastMs:
            lastRecordedAtRef.current === null
              ? null
              : recordedAtMs - lastRecordedAtRef.current,
        })

        return
      }

      if (!isAccurateEnough(accuracy)) {
        debugLog('record.inaccurate', { accuracy })
        return
      }

      const previous = lastAcceptedRef.current

      if (!isPlausibleStep(previous, point)) {
        debugLog('record.implausible', {
          accuracy,
          metres:
            previous === null
              ? null
              : Math.round(distanceBetweenMetres(previous, point)),
        })
        return
      }

      const depth = await storePoint(point)

      if (depth === null) {
        return
      }

      if (previous !== null) {
        distanceMetresRef.current += distanceBetweenMetres(previous, point)
      }

      lastRecordedAtRef.current = recordedAtMs
      lastAcceptedRef.current = point
      stored += 1

      void updateLiveActivity({
        distanceMetres: Math.round(distanceMetresRef.current),
        paused: false,
        elapsedSeconds: 0,
      })

      debugLog('point.stored', {
        n: stored,
        depth,
        recordedAt: point.recordedAt,
      })

      if (Date.now() - lastDrainedAtRef.current >= SYNC_INTERVAL_MS) {
        await drain()
      }
    }

    function submit(point: RecordedPoint, accuracy: number | null) {
      void record(point, accuracy).catch((cause) => {
        debugLog('record.threw', {
          ...describeError(cause),
          recordedAt: point.recordedAt,
        })
      })
    }

    function handleFix(position: GeolocationPosition) {
      debugLog('web.position', {
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      })

      submit(toRecordedPoint(position), position.coords.accuracy)
    }

    function handleSignalLoss(reason: string) {
      debugLog('signal.lost', {
        reason,
        gap: describeSignalGap(lastRecordedAtRef.current, Date.now()),
        stored,
      })

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
      debugLog('flushAndStop.begin', { stored })

      stopped = true
      releaseWatch()

      while (true) {
        const queued = await readBatch(MAX_BATCH_POINTS)

        if (queued.length === 0) {
          debugLog('flushAndStop.done')
          await flushDebugFile()
          return
        }

        try {
          const response = await fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(queued.map((entry) => entry.point)),
            redirect: 'manual',
          })

          debugLog('flushAndStop.response', {
            status: response.status,
            batch: queued.length,
          })

          if (classifySyncResponse(response.status) !== 'accepted') {
            return
          }
        } catch (cause) {
          debugLog('flushAndStop.threw', describeError(cause))
          return
        }

        await deletePoints(queued.map((entry) => entry.key))
      }
    }

    if (!paused) {
      if (isNativeApp()) {
        native = true

        startNativeWatch(submit, (error) =>
          handleSignalLoss(`GPS signal lost (${error.message})`),
        ).catch((cause) => {
          debugLog('native.start.failed', describeError(cause))
          stop('denied')
        })
      } else {
        watchId = navigator.geolocation.watchPosition(
          handleFix,
          handleError,
          WATCH_OPTIONS,
        )

        debugLog('web.watch.started', { watchId })
      }

      syncTimer = setInterval(() => void drain(), SYNC_INTERVAL_MS)

      let lastBeatAt = Date.now()

      heartbeatTimer = setInterval(() => {
        const now = Date.now()

        debugLog('heartbeat', {
          driftMs: now - lastBeatAt - HEARTBEAT_MS,
          visibility:
            typeof document === 'undefined' ? null : document.visibilityState,
          online: typeof navigator === 'undefined' ? null : navigator.onLine,
          stored,
        })

        lastBeatAt = now

        void flushDebugFile()
      }, HEARTBEAT_MS)
    }

    flushAndStopRef.current = flushAndStop

    document.addEventListener('visibilitychange', onVisibilityChange)

    void drain()

    return () => {
      debugLog('recorder.unmounted', { stored })

      void flushDebugFile()

      document.removeEventListener('visibilitychange', onVisibilityChange)
      flushAndStopRef.current = () => Promise.resolve()

      stopped = true
      releaseWatch()

      lastRecordedAtRef.current = null
      lastAcceptedRef.current = null
    }
  }, [isSupported, paused])

  const flushAndStop = useCallback(() => flushAndStopRef.current(), [])

  return {
    status: isSupported ? status : 'unsupported',
    flushAndStop,
    getDistanceMetres,
  }
}
