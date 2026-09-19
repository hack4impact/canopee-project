'use client'

import { useActionState } from 'react'
import { deleteAccount, type DeleteAccountState } from '@/app/profil/actions'

const FIELD =
  'w-full rounded-lg border border-canopee-forest/20 bg-canopee-cream/40 px-3 py-2 text-base text-canopee-forest focus-visible:border-canopee-green focus-visible:ring-2 focus-visible:ring-canopee-green/30 focus-visible:outline-none'

const LABEL = 'text-xs font-bold text-canopee-forest/70'

const ERROR = 'text-xs font-semibold text-canopee-coral-dark'

export function DeleteAccountForm({ className }: { className?: string }) {
  const [state, submit, pending] = useActionState<DeleteAccountState, FormData>(
    deleteAccount,
    {},
  )

  return (
    <form action={submit} className={className}>
      <p className="text-xs leading-snug text-canopee-forest">
        Vos patrouilles et leurs trajets seront supprimés définitivement. Vos
        signalements sont conservés, mais ne seront plus liés à votre compte.
      </p>

      <label className="flex flex-col gap-1">
        <span className={LABEL}>Saisissez SUPPRIMER pour confirmer</span>
        <input
          type="text"
          name="confirmation"
          autoComplete="off"
          required
          className={FIELD}
        />
      </label>

      {state.message && (
        <p role="alert" className={ERROR}>
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-lg bg-canopee-coral px-3 py-2 text-sm font-extrabold text-white transition-colors hover:bg-canopee-coral-dark focus-visible:ring-2 focus-visible:ring-canopee-coral focus-visible:outline-none disabled:opacity-60"
      >
        {pending ? 'Suppression…' : 'Supprimer définitivement'}
      </button>
    </form>
  )
}
