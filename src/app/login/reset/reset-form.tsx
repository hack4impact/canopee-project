'use client'

import { useActionState, useState } from 'react'
import { Spinner } from '@/components/spinner'
import {
  isValid,
  MIN_PASSWORD_LENGTH,
  validateNewPassword,
  type NewPasswordErrors,
  type NewPasswordInput,
} from '@/lib/auth/validation'
import { updatePassword, type NewPasswordState } from './actions'

const initialState: NewPasswordState = {}

const emptyInput: NewPasswordInput = {
  password: '',
  confirmPassword: '',
}

const FIELD =
  'rounded-lg border border-canopee-green/30 bg-white px-3 py-2.5 text-canopee-forest placeholder-zinc-500 transition-colors outline-none focus:border-canopee-green focus:ring-2 focus:ring-canopee-green/40'

const LABEL = 'text-sm font-medium text-canopee-forest'

const ERROR = 'text-sm font-medium text-canopee-coral-dark'

export function ResetForm() {
  const [state, formAction, pending] = useActionState(
    updatePassword,
    initialState,
  )
  const [input, setInput] = useState(emptyInput)
  const [clientErrors, setClientErrors] = useState<NewPasswordErrors>({})

  const errors = { ...state.errors, ...clientErrors }

  function update(field: keyof NewPasswordInput, value: string) {
    setInput((current) => ({ ...current, [field]: value }))
  }

  function submit(formData: FormData) {
    const found = validateNewPassword(input)
    setClientErrors(found)

    if (!isValid(found)) {
      return
    }

    formAction(formData)
  }

  return (
    <form action={submit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className={LABEL}>
          Nouveau mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          value={input.password}
          onChange={(event) => update('password', event.target.value)}
          aria-describedby={errors.password ? 'password-error' : undefined}
          className={FIELD}
        />
        {errors.password && (
          <p id="password-error" className={ERROR}>
            {errors.password}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmPassword" className={LABEL}>
          Confirmer le mot de passe
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
          className={FIELD}
        />
        {errors.confirmPassword && (
          <p id="confirm-password-error" className={ERROR}>
            {errors.confirmPassword}
          </p>
        )}
      </div>

      {state.message && (
        <p aria-live="polite" className={ERROR}>
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex touch-manipulation items-center justify-center gap-2 rounded-lg bg-canopee-green px-4 py-2.5 font-bold text-white shadow-sm transition-[background-color,transform] duration-150 ease-out hover:bg-canopee-forest focus-visible:ring-2 focus-visible:ring-canopee-green/50 focus-visible:outline-none active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        {pending && <Spinner />}
        {pending ? 'Enregistrement...' : 'Changer le mot de passe'}
      </button>
    </form>
  )
}
