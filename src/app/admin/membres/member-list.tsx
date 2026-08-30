'use client'

import { useActionState, useState } from 'react'
import {
  changeMemberRole,
  deleteMember,
  type Member,
  type MemberActionState,
} from './actions'
import { ROLES, type Role } from '@/lib/auth/roles'

const initialState: MemberActionState = {}

const ROLE_LABELS: Record<Role, string> = {
  volunteer: 'Bénévole',
  pro: 'Professionnel',
  admin: 'Administrateur',
}

/** Most privileged first, so the admin count is the first thing read. */
const SECTIONS: Role[] = ['admin', 'pro', 'volunteer']

const CONTROL_WIDTH = 'w-[8.5rem]'

function RoleControl({ member }: { member: Member }) {
  const [state, formAction, pending] = useActionState(
    changeMemberRole,
    initialState,
  )
  const [role, setRole] = useState<Role>(member.role)

  const name = [member.firstName, member.lastName].filter(Boolean).join(' ')

  return (
    <form
      action={formAction}
      className={`flex flex-col gap-1 ${CONTROL_WIDTH}`}
    >
      <input type="hidden" name="userId" value={member.id} />

      <label className="sr-only" htmlFor={`role-${member.id}`}>
        Rôle de {name || member.email}
      </label>
      <select
        id={`role-${member.id}`}
        name="role"
        value={role}
        onChange={(event) => setRole(event.target.value as Role)}
        className="w-full rounded-lg border border-canopee-forest/20 bg-white px-1.5 py-1.5 text-xs font-bold text-canopee-forest focus-visible:border-canopee-green focus-visible:ring-2 focus-visible:ring-canopee-green/30 focus-visible:outline-none"
      >
        {ROLES.map((value) => (
          <option key={value} value={value}>
            {ROLE_LABELS[value]}
          </option>
        ))}
      </select>

      {role !== member.role && (
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-canopee-green px-2 py-1.5 text-xs font-extrabold text-white transition-colors hover:bg-canopee-forest focus-visible:ring-2 focus-visible:ring-canopee-lime focus-visible:outline-none disabled:opacity-60"
        >
          {pending ? 'Enregistrement…' : 'Appliquer'}
        </button>
      )}

      {state.message && (
        <p
          aria-live="polite"
          className="text-xs font-semibold text-canopee-coral-dark"
        >
          {state.message}
        </p>
      )}
    </form>
  )
}

function DeleteControl({ member }: { member: Member }) {
  const [state, formAction, pending] = useActionState(
    deleteMember,
    initialState,
  )
  const [confirming, setConfirming] = useState(false)

  const name = [member.firstName, member.lastName].filter(Boolean).join(' ')

  if (!confirming) {
    return (
      <div className={`flex justify-end ${CONTROL_WIDTH}`}>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={`Supprimer le compte de ${name || member.email}`}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-canopee-coral/45 text-canopee-coral-dark transition-colors hover:bg-canopee-coral/10 focus-visible:ring-2 focus-visible:ring-canopee-coral focus-visible:outline-none"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <form
      action={formAction}
      className={`flex flex-col gap-1 ${CONTROL_WIDTH}`}
    >
      <input type="hidden" name="userId" value={member.id} />

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-canopee-coral px-2 py-1.5 text-xs font-extrabold text-white transition-colors hover:bg-canopee-coral-dark focus-visible:ring-2 focus-visible:ring-canopee-coral focus-visible:outline-none disabled:opacity-60"
      >
        {pending ? 'Suppression…' : 'Confirmer'}
      </button>

      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="w-full rounded-lg px-2 py-1 text-xs font-bold text-canopee-forest/60 transition-colors hover:text-canopee-forest focus-visible:ring-2 focus-visible:ring-canopee-green focus-visible:outline-none"
      >
        Annuler
      </button>

      {state.message && (
        <p
          aria-live="polite"
          className="text-xs font-semibold text-canopee-coral-dark"
        >
          {state.message}
        </p>
      )}
    </form>
  )
}

function MemberRow({
  member,
  removing,
}: {
  member: Member
  removing: boolean
}) {
  const name = [member.firstName, member.lastName].filter(Boolean).join(' ')

  return (
    <li className="border-t border-canopee-forest/10 first:border-t-0">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <span className="block text-base font-bold break-words text-canopee-forest">
            {name || member.email}
          </span>
          {name && (
            <span
              title={member.email}
              className="block truncate text-xs text-canopee-forest/55"
            >
              {member.email}
            </span>
          )}
        </div>

        {removing ? (
          <DeleteControl member={member} />
        ) : (
          <RoleControl member={member} />
        )}
      </div>
    </li>
  )
}

export function MemberList({ members }: { members: Member[] }) {
  const [removing, setRemoving] = useState(false)

  if (members.length === 0) {
    return (
      <div className="rounded-xl border border-canopee-forest/15 bg-white px-4 py-10 text-center">
        <p className="text-base font-bold text-canopee-forest">
          Aucun autre compte approuvé
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
          removing
            ? 'border-canopee-coral/45 bg-canopee-coral/10'
            : 'border-canopee-forest/15 bg-white'
        }`}
      >
        <span className="flex-1 text-sm font-bold text-canopee-forest">
          Mode suppression
        </span>

        <button
          type="button"
          role="switch"
          aria-checked={removing}
          aria-label="Mode suppression"
          onClick={() => setRemoving((on) => !on)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
            removing
              ? 'bg-canopee-coral focus-visible:ring-canopee-coral'
              : 'bg-canopee-forest/25 focus-visible:ring-canopee-green'
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-150 ${
              removing ? 'left-[1.375rem]' : 'left-0.5'
            }`}
          />
        </button>
      </div>

      {SECTIONS.map((section) => {
        const inRole = members.filter((member) => member.role === section)

        return (
          <section key={section} className="flex flex-col gap-1.5">
            <h2 className="text-sm font-extrabold tracking-[0.08em] text-canopee-forest/50 uppercase">
              {ROLE_LABELS[section]}
              <span className="ml-1.5 font-heading text-base text-canopee-green tabular-nums">
                {inRole.length}
              </span>
            </h2>

            {inRole.length === 0 ? (
              <p className="rounded-xl border border-canopee-forest/15 bg-white px-3 py-3 text-sm text-canopee-forest/45">
                Personne
              </p>
            ) : (
              <ul className="overflow-hidden rounded-xl border border-canopee-forest/15 bg-white">
                {inRole.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    removing={removing}
                  />
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
