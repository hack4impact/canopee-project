'use client'

import { useActionState, useState } from 'react'
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
      <div className="flex flex-col gap-1">
        <label htmlFor="email">Email</label>
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
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={input.password}
          onChange={(event) => update('password', event.target.value)}
          aria-describedby={errors.password ? 'password-error' : undefined}
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700"
        />
        <p className="text-sm text-zinc-500">
          At least {MIN_PASSWORD_LENGTH} characters.
        </p>
        {errors.password && (
          <p id="password-error" className="text-sm text-red-600">
            {errors.password}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="confirmPassword">Confirm password</label>
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
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700"
        />
        {errors.confirmPassword && (
          <p id="confirm-password-error" className="text-sm text-red-600">
            {errors.confirmPassword}
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
        {pending ? 'Creating account...' : 'Create account'}
      </button>
    </form>
  )
}
