'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { Spinner } from '@/components/spinner'
import {
  isValid,
  MIN_PASSWORD_LENGTH,
  validateSignup,
  type SignupErrors,
  type SignupInput,
} from '@/lib/auth/validation'
import { signup, type SignupState } from './actions'

const initialState: SignupState = {}

const emptyInput: SignupInput = {
  email: '',
  password: '',
  confirmPassword: '',
}

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signup, initialState)
  const [input, setInput] = useState(emptyInput)
  const [clientErrors, setClientErrors] = useState<SignupErrors>({})

  // Whatever the browser caught takes precedence, since it reflects what is
  // currently typed. Server messages fill in the rest, like a taken email.
  const errors = { ...state.errors, ...clientErrors }

  function update(field: keyof SignupInput, value: string) {
    setInput((current) => ({ ...current, [field]: value }))
  }

  // Runs before the Server Action. Returning early keeps a form we already
  // know is wrong from making the round trip.
  function submit(formData: FormData) {
    const found = validateSignup(input)
    setClientErrors(found)

    if (!isValid(found)) {
      return
    }

    formAction(formData)
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
          value={input.email}
          onChange={(event) => update('email', event.target.value)}
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

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="password"
          className="text-sm font-medium text-canopee-forest"
        >
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={input.password}
          onChange={(event) => update('password', event.target.value)}
          aria-describedby={errors.password ? 'password-error' : undefined}
          className="rounded-lg border border-canopee-green/30 bg-white px-3 py-2.5 text-canopee-forest placeholder-zinc-500 transition-colors outline-none focus:border-canopee-green focus:ring-2 focus:ring-canopee-green/40"
        />
        <p className="text-sm text-canopee-forest/70">
          Minimalement {MIN_PASSWORD_LENGTH} caractères.
        </p>
        {errors.password && (
          <p
            id="password-error"
            className="text-sm font-medium text-canopee-coral-dark"
          >
            {errors.password}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="confirmPassword"
          className="text-sm font-medium text-canopee-forest"
        >
          Confirmez le mot de passe
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={input.confirmPassword}
          onChange={(event) => update('confirmPassword', event.target.value)}
          aria-describedby={
            errors.confirmPassword ? 'confirm-password-error' : undefined
          }
          className="rounded-lg border border-canopee-green/30 bg-white px-3 py-2.5 text-canopee-forest placeholder-zinc-500 transition-colors outline-none focus:border-canopee-green focus:ring-2 focus:ring-canopee-green/40"
        />
        {errors.confirmPassword && (
          <p
            id="confirm-password-error"
            className="text-sm font-medium text-canopee-coral-dark"
          >
            {errors.confirmPassword}
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
        {pending ? 'Création de votre compte...' : 'Créez votre compte'}
      </button>

      <p className="text-center text-sm text-canopee-forest/80">
        Déjà un compte?{' '}
        <Link
          href="/login"
          className="font-medium text-canopee-forest underline underline-offset-4 transition-colors hover:text-canopee-green"
        >
          Connectez-vous
        </Link>
      </p>
    </form>
  )
}
