const DB_NAME = 'canopee-reports'

const DB_VERSION = 1

const STORE = 'pending'

export const MAX_QUEUED_REPORTS = 50

export type QueuedReport = {
  id: string
  fields: Record<string, string>
  photo: File | null
  queuedAt: string
}

let connection: Promise<IDBDatabase> | null = null

export function isReportQueueAvailable(): boolean {
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
        request.result.createObjectStore(STORE, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

  return connection
}

function run<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode)
        const pending = action(transaction.objectStore(STORE))

        pending.onsuccess = () => resolve(pending.result)
        transaction.onerror = () => reject(transaction.error)
      }),
  )
}

export async function countQueuedReports(): Promise<number> {
  return run('readonly', (store) => store.count())
}

export async function readQueuedReports(): Promise<QueuedReport[]> {
  const rows = await run('readonly', (store) => store.getAll())

  return (rows as QueuedReport[]).sort((a, b) =>
    a.queuedAt.localeCompare(b.queuedAt),
  )
}

export async function deleteQueuedReport(id: string): Promise<void> {
  await run('readwrite', (store) => store.delete(id))
}

export async function appendQueuedReport(
  report: QueuedReport,
): Promise<number> {
  await run('readwrite', (store) => store.put(report))

  return countQueuedReports()
}

export function toFormData(report: QueuedReport): FormData {
  const formData = new FormData()

  for (const [name, value] of Object.entries(report.fields)) {
    formData.set(name, value)
  }

  formData.set('id', report.id)

  if (report.photo) {
    formData.set('photo', report.photo)
  }

  return formData
}

export function fromFormData(formData: FormData, id: string): QueuedReport {
  const fields: Record<string, string> = {}
  let photo: File | null = null

  for (const [name, value] of formData.entries()) {
    if (value instanceof File) {
      if (name === 'photo' && value.size > 0) {
        photo = value
      }
      continue
    }

    fields[name] = value
  }

  delete fields.id

  return { id, fields, photo, queuedAt: new Date().toISOString() }
}
