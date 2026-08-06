'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
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
  /**
   * Where to send the user once they are signed in. Already validated by the
   * page; the action validates it again, because a Server Action is a POST
   * endpoint and nothing forces a caller to go through this form.
   */
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

      <div className="flex flex-col gap-1">
        <label htmlFor="email">Adresse courriel</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={input.email}
          onChange={(event) => update('email', event.target.value)}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700"
        />
        {errors.email && (
          <p id="email-error" className="text-sm text-red-600">
            {errors.email}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password">Mot de passe</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={input.password}
          onChange={(event) => update('password', event.target.value)}
          aria-describedby={errors.password ? 'password-error' : undefined}
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700"
        />
        {errors.password && (
          <p id="password-error" className="text-sm text-red-600">
            {errors.password}
          </p>
        )}
      </div>

      {state.message && (
        <p aria-live="polite" className="text-sm text-red-600">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-black"
      >
        {pending ? 'Connexion...' : 'Se connecter'}
      </button>

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        Pas de compte?{' '}
        <Link
          href="/signup"
          className="font-medium text-black underline underline-offset-4 dark:text-zinc-50"
        >
          Créez votre compte
        </Link>
      </p>
    </form>
  )
}
