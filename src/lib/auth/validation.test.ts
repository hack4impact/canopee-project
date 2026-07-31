import { describe, expect, it } from 'vitest'
import {
  isValid,
  MIN_PASSWORD_LENGTH,
  validateSignup,
  type SignupInput,
} from './validation'

/** A form filled in correctly, so each test can spoil one field at a time. */
function goodInput(overrides: Partial<SignupInput> = {}): SignupInput {
  return {
    email: 'volunteer@canopee.org',
    password: 'longenough',
    confirmPassword: 'longenough',
    ...overrides,
  }
}

describe('validateSignup', () => {
  it('accepts a correctly filled form', () => {
    expect(validateSignup(goodInput())).toEqual({})
  })

  it('rejects an email without an @ or a domain', () => {
    expect(
      validateSignup(goodInput({ email: 'volunteer' })).email,
    ).toBeDefined()
    expect(
      validateSignup(goodInput({ email: 'volunteer@' })).email,
    ).toBeDefined()
    expect(
      validateSignup(goodInput({ email: 'volunteer@canopee' })).email,
    ).toBeDefined()
  })

  it('ignores whitespace around a pasted email', () => {
    expect(
      validateSignup(goodInput({ email: '  volunteer@canopee.org  ' })).email,
    ).toBeUndefined()
  })

  it('rejects a password below the minimum length', () => {
    const short = 'a'.repeat(MIN_PASSWORD_LENGTH - 1)
    const errors = validateSignup(
      goodInput({ password: short, confirmPassword: short }),
    )

    expect(errors.password).toBeDefined()
  })

  it('accepts a password of exactly the minimum length', () => {
    const exact = 'a'.repeat(MIN_PASSWORD_LENGTH)
    const errors = validateSignup(
      goodInput({ password: exact, confirmPassword: exact }),
    )

    expect(errors.password).toBeUndefined()
  })

  it('rejects passwords that do not match', () => {
    const errors = validateSignup(
      goodInput({ confirmPassword: 'somethingelse' }),
    )

    expect(errors.confirmPassword).toBeDefined()
    expect(errors.password).toBeUndefined()
  })

  it('reports every empty field at once', () => {
    const errors = validateSignup({
      email: '',
      password: '',
      confirmPassword: '',
    })

    expect(errors.email).toBeDefined()
    expect(errors.password).toBeDefined()
    expect(errors.confirmPassword).toBeDefined()
  })
})

describe('isValid', () => {
  it('is true only when nothing failed', () => {
    expect(isValid({})).toBe(true)
    expect(isValid({ email: 'Enter a valid email address.' })).toBe(false)
  })
})
