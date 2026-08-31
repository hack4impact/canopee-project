import {
  appendQueuedReport,
  countQueuedReports,
  deleteQueuedReport,
  fromFormData,
  isReportQueueAvailable,
  readQueuedReports,
  toFormData,
} from '@/lib/reports/report-queue'
import type { ReportFormState } from '@/lib/reports/submit'

const ENDPOINT = '/api/reports'

async function post(formData: FormData): Promise<Response> {
  return fetch(ENDPOINT, {
    method: 'POST',
    body: formData,
    redirect: 'manual',
  })
}

export async function sendReport(
  _prevState: ReportFormState,
  formData: FormData,
): Promise<ReportFormState> {
  const id = crypto.randomUUID()

  formData.set('id', id)

  try {
    const response = await post(formData)
    const state = (await response.json()) as ReportFormState

    if (!response.ok) {
      return state
    }

    return { submittedId: state.submittedId ?? id }
  } catch {
    if (!isReportQueueAvailable()) {
      return {
        message: 'Impossible d’envoyer le signalement. Réessayez.',
      }
    }

    await appendQueuedReport(fromFormData(formData, id))

    return { submittedId: id, queued: true }
  }
}

export async function drainQueuedReports(): Promise<number> {
  if (!isReportQueueAvailable()) {
    return 0
  }

  const pending = await readQueuedReports()

  for (const report of pending) {
    let response: Response

    try {
      response = await post(toFormData(report))
    } catch {
      break
    }

    if (response.ok) {
      await deleteQueuedReport(report.id)
      continue
    }

    const state = (await response
      .json()
      .catch(() => null)) as ReportFormState | null

    if (response.status === 422 && state?.errors) {
      await deleteQueuedReport(report.id)
      continue
    }

    break
  }

  return countQueuedReports()
}

export async function pendingReportCount(): Promise<number> {
  if (!isReportQueueAvailable()) {
    return 0
  }

  return countQueuedReports()
}
