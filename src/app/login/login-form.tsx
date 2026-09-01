'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
        <Label htmlFor="email">Adresse courriel</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={input.email}
          onChange={(event) => update('email', event.target.value)}
          aria-describedby={errors.email ? 'email-error' : undefined}
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
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor="password">Mot de passe</Label>
          <Link
            href="/login/forgot"
            className="text-sm font-medium text-canopee-forest/70 underline underline-offset-4 transition-colors hover:text-canopee-green"
          >
            Mot de passe oublié?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={input.password}
          onChange={(event) => update('password', event.target.value)}
          aria-describedby={errors.password ? 'password-error' : undefined}
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

      <Button size="lg" type="submit" disabled={pending}>
        {pending && <Spinner />}
        {pending ? 'Connexion...' : 'Se connecter'}
      </Button>

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
