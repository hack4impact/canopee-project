'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
        <Label htmlFor="password">Nouveau mot de passe</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          value={input.password}
          onChange={(event) => update('password', event.target.value)}
          aria-describedby={errors.password ? 'password-error' : undefined}
        />
        {errors.password && (
          <p id="password-error" className={ERROR}>
            {errors.password}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={input.confirmPassword}
          onChange={(event) => update('confirmPassword', event.target.value)}
          aria-describedby={
            errors.confirmPassword ? 'confirm-password-error' : undefined
          }
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

      <Button size="lg" type="submit" disabled={pending}>
        {pending && <Spinner />}
        {pending ? 'Enregistrement...' : 'Changer le mot de passe'}
      </Button>
    </form>
  )
}
