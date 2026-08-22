'use client'

import { useActionState } from 'react'
import { resolveReport, type ResolveReportState } from '@/lib/reports/actions'

const initialState: ResolveReportState = {}

export function ResolveReportButton({
  reportId,
  resolved,
}: {
  reportId: string
  resolved: boolean
}) {
  const [state, formAction, pending] = useActionState(
    resolveReport,
    initialState,
  )

  if (resolved) {
    return null
  }

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="reportId" value={reportId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-black"
      >
        {pending ? 'Résolution en cours…' : 'Résolu'}
      </button>
      {state.message && (
        <p aria-live="polite" className="text-sm text-red-600">
          {state.message}
        </p>
      )}
    </form>
  )
}
