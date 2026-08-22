import { MAX_BUFFERED_POINTS, type RecordedPoint } from '@/lib/patrols/points'

const DB_NAME = 'canopee-patrol'

const DB_VERSION = 1

const STORE = 'points'

export type QueuedPoint = {
  key: number
  point: RecordedPoint
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
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

  return connection
}

async function request<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await open()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode)
    const pending = run(transaction.objectStore(STORE))

    pending.onsuccess = () => resolve(pending.result)
    transaction.onerror = () => reject(transaction.error)
  })
}

export async function countPoints(): Promise<number> {
  return request('readonly', (store) => store.count())
}

export async function clearPoints(): Promise<void> {
  await request('readwrite', (store) => store.clear())
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

export async function appendPoint(point: RecordedPoint): Promise<void> {
  await request('readwrite', (store) => store.add(point))

  const total = await countPoints()

  if (total <= MAX_BUFFERED_POINTS) {
    return
  }

  const stale = await request('readonly', (store) =>
    store.getAllKeys(null, total - MAX_BUFFERED_POINTS),
  )

  await deletePoints(stale as number[])
}
