'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { Spinner } from '@/components/spinner'
import { REDIRECT_PARAM } from '@/lib/auth/routes'
import {
  isValid,
  validateLogin,
  type LoginErrors,
  type LoginInput,
} from '@/lib/auth/validation'
import { login, type LoginState } from './actions'

const initialState: LoginState = {}

const emptyInput: LoginInput = {
  email: '',
  password: '',
}

type LoginFormProps = {
  redirectTo: string
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(login, initialState)
  const [input, setInput] = useState(emptyInput)
  const [clientErrors, setClientErrors] = useState<LoginErrors>({})

  const errors = { ...state.errors, ...clientErrors }

  function update(field: keyof LoginInput, value: string) {
    setInput((current) => ({ ...current, [field]: value }))
  }

  function submit(formData: FormData) {
    const found = validateLogin(input)
    setClientErrors(found)

    if (!isValid(found)) {
      return
    }

    formAction(formData)
  }

  return (
    <form action={submit} noValidate className="flex flex-col gap-4">
      <input type="hidden" name={REDIRECT_PARAM} value={redirectTo} />

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
          autoComplete="current-password"
          value={input.password}
          onChange={(event) => update('password', event.target.value)}
          aria-describedby={errors.password ? 'password-error' : undefined}
          className="rounded-lg border border-canopee-green/30 bg-white px-3 py-2.5 text-canopee-forest placeholder-zinc-500 transition-colors outline-none focus:border-canopee-green focus:ring-2 focus:ring-canopee-green/40"
        />
        {errors.password && (
          <p
            id="password-error"
            className="text-sm font-medium text-canopee-coral-dark"
          >
            {errors.password}
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
        {pending ? 'Connexion...' : 'Se connecter'}
      </button>

      <p className="text-center text-sm text-canopee-forest/80">
        Pas de compte?{' '}
        <Link
          href="/signup"
          className="font-medium text-canopee-forest underline underline-offset-4 transition-colors hover:text-canopee-green"
        >
          Créez votre compte
        </Link>
      </p>
    </form>
  )
}
