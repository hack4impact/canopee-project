'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { CheckIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { resolveReport, type ResolveReportState } from '@/lib/reports/actions'

const initialState: ResolveReportState = {}

export function ResolveReportButton({
  reportId,
  resolved,
  onResolved,
  fullWidth = false,
}: {
  reportId: string
  resolved: boolean
  onResolved?: () => void
  fullWidth?: boolean
}) {
  const [state, formAction, pending] = useActionState(
    resolveReport,
    initialState,
  )
  const [confirming, setConfirming] = useState(false)
  const submitted = useRef(false)

  useEffect(() => {
    if (pending) {
      submitted.current = true
      return
    }

    if (submitted.current) {
      submitted.current = false

      if (!state.message) {
        onResolved?.()
      }
    }
  }, [pending, state, onResolved])

  if (resolved) {
    return null
  }

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="reportId" value={reportId} />

      {confirming ? (
        <>
          <p className="text-sm text-canopee-forest/70">
            Le signalement quittera la carte et un courriel de confirmation
            partira vers la personne qui l&apos;a soumis.
          </p>
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={pending}
              className={fullWidth ? 'flex-1' : undefined}
            >
              <CheckIcon data-icon="inline-start" />
              {pending ? 'Résolution…' : 'Confirmer la résolution'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setConfirming(false)}
            >
              Annuler
            </Button>
          </div>
        </>
      ) : (
        <Button
          type="button"
          onClick={() => setConfirming(true)}
          className={fullWidth ? 'w-full' : undefined}
        >
          <CheckIcon data-icon="inline-start" />
          Marquer résolu
        </Button>
      )}

      {state.message && (
        <p aria-live="polite" className="text-sm font-medium text-destructive">
          {state.message}
        </p>
      )}
    </form>
  )
}
