'use client'

import { useActionState, useState } from 'react'
import {
  approveVolunteer,
  rejectVolunteer,
  type VolunteerActionState,
} from './actions'

const initialState: VolunteerActionState = {}

type PendingVolunteer = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  createdAt: Date
}

const dateFormatter = new Intl.DateTimeFormat('fr-CA', {
  dateStyle: 'long',
  timeZone: 'America/Toronto',
})

const ERROR = 'text-xs font-semibold text-canopee-coral-dark'

const ICON_BUTTON =
  'inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60'

function ApproveButton({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState(
    approveVolunteer,
    initialState,
  )

  return (
    <form action={formAction} className="inline-flex flex-col items-end gap-1">
      <input type="hidden" name="userId" value={userId} />
      <button
        type="submit"
        disabled={pending}
        aria-label="Approuver la demande"
        className={`${ICON_BUTTON} border-transparent bg-canopee-green text-white hover:bg-canopee-forest focus-visible:ring-canopee-lime`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path d="m20 6-11 11-5-5" />
        </svg>
      </button>
      {state.message && (
        <p aria-live="polite" className={`${ERROR} text-right`}>
          {state.message}
        </p>
      )}
    </form>
  )
}

function RejectPanel({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState(
    rejectVolunteer,
    initialState,
  )

  return (
    <form
      action={formAction}
      className="flex flex-col gap-2 border-t border-canopee-coral/25 bg-canopee-coral/5 p-3"
    >
      <input type="hidden" name="userId" value={userId} />

      <label className="flex flex-col gap-1">
        <span className="text-xs font-bold text-canopee-forest/70">
          Raison du refus (optionnelle)
        </span>
        <input
          name="reason"
          type="text"
          className="w-full rounded-lg border border-canopee-forest/20 bg-white px-3 py-2 text-base text-canopee-forest focus-visible:border-canopee-coral focus-visible:ring-2 focus-visible:ring-canopee-coral/30 focus-visible:outline-none"
        />
      </label>

      <p className="text-sm leading-snug text-canopee-forest/70">
        La personne reçoit un courriel lui indiquant que sa demande a été
        refusée.
      </p>

      {state.message && (
        <p aria-live="polite" className={ERROR}>
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-canopee-coral px-3 py-2 text-sm font-extrabold text-white transition-colors hover:bg-canopee-coral-dark focus-visible:ring-2 focus-visible:ring-canopee-coral focus-visible:outline-none disabled:opacity-60"
      >
        {pending ? 'Refus…' : 'Confirmer le refus'}
      </button>
    </form>
  )
}

function VolunteerRow({ volunteer }: { volunteer: PendingVolunteer }) {
  const [rejecting, setRejecting] = useState(false)

  const name = [volunteer.firstName, volunteer.lastName]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <tr className="border-t border-canopee-forest/10 first:border-t-0">
        <td className="px-2.5 py-2.5">
          <span className="block text-base font-bold break-words text-canopee-forest">
            {name || volunteer.email}
          </span>
          {name && (
            <span className="block text-[13px] break-all text-canopee-forest/55">
              {volunteer.email}
            </span>
          )}
          <span className="block text-[13px] text-canopee-forest/45">
            Inscrit le {dateFormatter.format(volunteer.createdAt)}
          </span>
        </td>

        <td className="px-2 py-2.5 align-middle">
          <div className="flex items-start justify-end gap-1.5">
            <ApproveButton userId={volunteer.id} />

            <button
              type="button"
              onClick={() => setRejecting((open) => !open)}
              aria-expanded={rejecting}
              aria-label={rejecting ? 'Annuler le refus' : 'Refuser la demande'}
              className={`${ICON_BUTTON} border-canopee-coral/45 text-canopee-coral-dark hover:bg-canopee-coral/10 focus-visible:ring-canopee-coral`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={3}
                strokeLinecap="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </td>
      </tr>

      {rejecting && (
        <tr>
          <td colSpan={2} className="p-0">
            <RejectPanel userId={volunteer.id} />
          </td>
        </tr>
      )}
    </>
  )
}

export function VolunteerQueue({
  volunteers,
}: {
  volunteers: PendingVolunteer[]
}) {
  if (volunteers.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-canopee-forest/15 bg-white px-4 py-10 text-center">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-7 w-7 text-canopee-green"
          aria-hidden="true"
        >
          <path d="m20 6-11 11-5-5" />
        </svg>
        <p className="text-base font-bold text-canopee-forest">
          Aucune demande en attente
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-canopee-forest/15 bg-white">
      <table className="w-full table-fixed border-collapse">
        <caption className="sr-only">
          Demandes de comptes en attente d’examen
        </caption>
        <colgroup>
          <col />
          <col className="w-[6.5rem]" />
        </colgroup>
        <thead>
          <tr>
            <th
              scope="col"
              className="px-2.5 pt-2.5 pb-1 text-left text-[11px] font-extrabold tracking-[0.08em] text-canopee-forest/45 uppercase"
            >
              Personne
            </th>
            <th
              scope="col"
              className="px-2 pt-2.5 pb-1 text-right text-[11px] font-extrabold tracking-[0.08em] text-canopee-forest/45 uppercase"
            >
              Décision
            </th>
          </tr>
        </thead>
        <tbody>
          {volunteers.map((volunteer) => (
            <VolunteerRow key={volunteer.id} volunteer={volunteer} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
