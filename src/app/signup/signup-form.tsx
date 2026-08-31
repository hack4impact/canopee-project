'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
}

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signup, initialState)
  const [input, setInput] = useState(emptyInput)
  const [clientErrors, setClientErrors] = useState<SignupErrors>({})

  const errors = { ...state.errors, ...clientErrors }

  function update(field: keyof SignupInput, value: string) {
    setInput((current) => ({ ...current, [field]: value }))
  }

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
        <Label htmlFor="firstName">Prénom</Label>
        <Input
          id="firstName"
          name="firstName"
          type="text"
          autoComplete="given-name"
          value={input.firstName}
          onChange={(event) => update('firstName', event.target.value)}
          aria-describedby={errors.firstName ? 'firstName-error' : undefined}
        />
        {errors.firstName && (
          <p
            id="firstName-error"
            className="text-sm font-medium text-canopee-coral-dark"
          >
            {errors.firstName}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lastName">Nom</Label>
        <Input
          id="lastName"
          name="lastName"
          type="text"
          autoComplete="family-name"
          value={input.lastName}
          onChange={(event) => update('lastName', event.target.value)}
          aria-describedby={errors.lastName ? 'lastName-error' : undefined}
        />
        {errors.lastName && (
          <p
            id="lastName-error"
            className="text-sm font-medium text-canopee-coral-dark"
          >
            {errors.lastName}
          </p>
        )}
      </div>
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
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={input.password}
          onChange={(event) => update('password', event.target.value)}
          aria-describedby={errors.password ? 'password-error' : undefined}
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
        <Label htmlFor="confirmPassword">Confirmez le mot de passe</Label>
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

      <Button size="lg" type="submit" disabled={pending}>
        {pending && <Spinner />}
        {pending ? 'Création de votre compte...' : 'Créez votre compte'}
      </Button>

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
