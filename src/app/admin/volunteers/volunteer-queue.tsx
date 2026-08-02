'use client'

import { useActionState } from 'react'
import {
  approveVolunteer,
  rejectVolunteer,
  type VolunteerActionState,
} from './actions'

const initialState: VolunteerActionState = {}

type PendingVolunteer = {
  id: string
  email: string
  createdAt: Date
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function ApproveButton({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState(
    approveVolunteer,
    initialState,
  )

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="userId" value={userId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-black"
      >
        {pending ? 'Approbation en cours…' : 'Approuver'}
      </button>
      {state.message && (
        <p aria-live="polite" className="text-sm text-red-600">
          {state.message}
        </p>
      )}
    </form>
  )
}

function RejectForm({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState(
    rejectVolunteer,
    initialState,
  )

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-2">
      <input type="hidden" name="userId" value={userId} />
      <label htmlFor={`reason-${userId}`} className="sr-only">
        Raison du rejet (optionnel)
      </label>
      <input
        id={`reason-${userId}`}
        name="reason"
        type="text"
        placeholder="Raison (optionnel)"
        className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300"
      >
        {pending ? 'Rejet en cours…' : 'Rejeter'}
      </button>
      {state.message && (
        <p aria-live="polite" className="text-sm text-red-600">
          {state.message}
        </p>
      )}
    </form>
  )
}

export function VolunteerQueue({
  volunteers,
}: {
  volunteers: PendingVolunteer[]
}) {
  if (volunteers.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-zinc-500 dark:border-zinc-700">
        Aucun utilisateur en attente d'approbation.
      </p>
    )
  }

  return (
    <ul className="flex flex-col divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
      {volunteers.map((volunteer) => (
        <li
          key={volunteer.id}
          className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-start sm:justify-between"
        >
          <div className="flex flex-col gap-1">
            <span className="font-medium text-black dark:text-zinc-50">
              {volunteer.email}
            </span>
            <span className="text-sm text-zinc-500">
              Inscrit le {formatDate(volunteer.createdAt)}
            </span>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:items-end">
            <ApproveButton userId={volunteer.id} />
            <RejectForm userId={volunteer.id} />
          </div>
        </li>
      ))}
    </ul>
  )
}