'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { Spinner } from '@/components/spinner'
import {
  isValid,
  validatePasswordReset,
  type PasswordResetErrors,
} from '@/lib/auth/validation'
import { requestPasswordReset, type PasswordResetState } from '../actions'

const initialState: PasswordResetState = {}

export function ForgotForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    initialState,
  )
  const [email, setEmail] = useState('')
  const [clientErrors, setClientErrors] = useState<PasswordResetErrors>({})

  const errors = { ...state.errors, ...clientErrors }

  function submit(formData: FormData) {
    const found = validatePasswordReset({ email })
    setClientErrors(found)

    if (!isValid(found)) {
      return
    }

    formAction(formData)
  }

  if (state.sent) {
    return (
      <div className="flex flex-col gap-4">
        <p
          aria-live="polite"
          className="rounded-lg bg-canopee-green/10 px-3 py-2.5 text-center text-sm font-medium text-canopee-forest"
        >
          Si un compte est associé à cette adresse, un courriel vient d’être
          envoyé. Vérifiez vos courriels indésirables si vous ne le voyez pas.
        </p>

        <Link
          href="/login"
          className="inline-flex touch-manipulation items-center justify-center rounded-lg bg-canopee-green px-4 py-2.5 font-bold text-white shadow-sm transition-[background-color] duration-150 ease-out hover:bg-canopee-forest focus-visible:ring-2 focus-visible:ring-canopee-green/50 focus-visible:outline-none"
        >
          Retour à la connexion
        </Link>
      </div>
    )
  }

  return (
    <form action={submit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="email"
          className="text-sm font-medium text-canopee-forest"
        >
          Adresse courriel
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className="rounded-lg border border-canopee-green/30 bg-white px-3 py-2.5 text-canopee-forest placeholder-zinc-500 transition-colors outline-none focus:border-canopee-green focus:ring-2 focus:ring-canopee-green/40"
        />
        {errors.email && (
          <p
            id="email-error"
            className="text-sm font-medium text-canopee-coral-dark"
          >
            {errors.email}
          </p>
        )}
      </div>

      {state.message && (
        <p
          aria-live="polite"
          className="text-sm font-medium text-canopee-coral-dark"
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex touch-manipulation items-center justify-center gap-2 rounded-lg bg-canopee-green px-4 py-2.5 font-bold text-white shadow-sm transition-[background-color,transform] duration-150 ease-out hover:bg-canopee-forest focus-visible:ring-2 focus-visible:ring-canopee-green/50 focus-visible:outline-none active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        {pending && <Spinner />}
        {pending ? 'Envoi...' : 'Envoyer le lien'}
      </button>

      <p className="text-center text-sm text-canopee-forest/80">
        <Link
          href="/login"
          className="font-medium text-canopee-forest underline underline-offset-4 transition-colors hover:text-canopee-green"
        >
          Retour à la connexion
        </Link>
      </p>
    </form>
  )
}
