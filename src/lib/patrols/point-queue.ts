import { MAX_BUFFERED_POINTS, type RecordedPoint } from '@/lib/patrols/points'

const DB_NAME = 'canopee-patrol'

const DB_VERSION = 2

const STORE = 'points'

const EVENT_STORE = 'events'

const MAX_BUFFERED_EVENTS = 5_000

export type QueuedPoint = {
  key: number
  point: RecordedPoint
}

export type DebugEvent = {
  at: string
  kind: string
  detail?: Record<string, unknown>
}

let connection: Promise<IDBDatabase> | null = null

export function isPointQueueAvailable(): boolean {
  return typeof indexedDB !== 'undefined'
}

function open(): Promise<IDBDatabase> {
  if (connection) {
    return connection
  }

  connection = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE, { autoIncrement: true })
      }

      if (!request.result.objectStoreNames.contains(EVENT_STORE)) {
        request.result.createObjectStore(EVENT_STORE, { autoIncrement: true })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

  return connection
}

async function request<T>(
  store: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await open()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, mode)
    const pending = run(transaction.objectStore(store))

    pending.onsuccess = () => resolve(pending.result)
    transaction.onerror = () => reject(transaction.error)
  })
}

export async function countPoints(): Promise<number> {
  return request(STORE, 'readonly', (store) => store.count())
}

export async function clearPoints(): Promise<void> {
  await request(STORE, 'readwrite', (store) => store.clear())
}

export async function deletePoints(keys: number[]): Promise<void> {
  if (keys.length === 0) {
    return
  }

  const db = await open()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite')
    const store = transaction.objectStore(STORE)

    for (const key of keys) {
      store.delete(key)
    }

    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

export async function readBatch(limit: number): Promise<QueuedPoint[]> {
  const db = await open()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readonly')
    const store = transaction.objectStore(STORE)
    const points = store.getAll(null, limit)
    const keys = store.getAllKeys(null, limit)

    transaction.oncomplete = () =>
      resolve(
        points.result.map((point, index) => ({
          key: keys.result[index] as number,
          point: point as RecordedPoint,
        })),
      )

    transaction.onerror = () => reject(transaction.error)
  })
}

export async function appendPoint(point: RecordedPoint): Promise<number> {
  await request(STORE, 'readwrite', (store) => store.add(point))

  const total = await countPoints()

  if (total <= MAX_BUFFERED_POINTS) {
    return total
  }

  const stale = await request(STORE, 'readonly', (store) =>
    store.getAllKeys(null, total - MAX_BUFFERED_POINTS),
  )

  await deletePoints(stale as number[])

  return MAX_BUFFERED_POINTS
}

export async function appendEvent(event: DebugEvent): Promise<void> {
  await request(EVENT_STORE, 'readwrite', (store) => store.add(event))

  const total = await request(EVENT_STORE, 'readonly', (store) => store.count())

  if (total <= MAX_BUFFERED_EVENTS) {
    return
  }

  const stale = await request(EVENT_STORE, 'readonly', (store) =>
    store.getAllKeys(null, total - MAX_BUFFERED_EVENTS),
  )

  const db = await open()

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(EVENT_STORE, 'readwrite')
    const store = transaction.objectStore(EVENT_STORE)

    for (const key of stale) {
      store.delete(key)
    }

    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

export async function readEvents(): Promise<DebugEvent[]> {
  const events = await request(EVENT_STORE, 'readonly', (store) =>
    store.getAll(),
  )

  return events as DebugEvent[]
}

export async function clearEvents(): Promise<void> {
  await request(EVENT_STORE, 'readwrite', (store) => store.clear())
}
