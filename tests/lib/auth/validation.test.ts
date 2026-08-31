import { describe, expect, it } from 'vitest'
import {
  isValid,
  MIN_PASSWORD_LENGTH,
  validateNewPassword,
  validatePasswordReset,
  validateSignup,
  type SignupInput,
} from '@/lib/auth/validation'

function goodInput(overrides: Partial<SignupInput> = {}): SignupInput {
  return {
    firstName: 'Marie',
    lastName: 'Tremblay',
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
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    })

    expect(errors.firstName).toBeDefined()
    expect(errors.lastName).toBeDefined()
    expect(errors.email).toBeDefined()
    expect(errors.password).toBeDefined()
    expect(errors.confirmPassword).toBeDefined()
  })
})

describe('validatePasswordReset', () => {
  it('accepts a well-formed address', () => {
    expect(validatePasswordReset({ email: 'volunteer@canopee.org' })).toEqual(
      {},
    )
  })

  it('ignores whitespace around a pasted email', () => {
    expect(
      validatePasswordReset({ email: '  volunteer@canopee.org  ' }).email,
    ).toBeUndefined()
  })

  it('rejects an address that is only whitespace', () => {
    expect(validatePasswordReset({ email: '   ' }).email).toBeDefined()
  })

  it('rejects an address without an @ or a domain', () => {
    expect(validatePasswordReset({ email: 'volunteer' }).email).toBeDefined()
    expect(validatePasswordReset({ email: 'volunteer@' }).email).toBeDefined()
    expect(
      validatePasswordReset({ email: 'volunteer@canopee' }).email,
    ).toBeDefined()
  })
})

describe('validateNewPassword', () => {
  it('accepts two matching passwords of sufficient length', () => {
    expect(
      validateNewPassword({
        password: 'longenough',
        confirmPassword: 'longenough',
      }),
    ).toEqual({})
  })

  it('rejects a password below the minimum length', () => {
    const short = 'a'.repeat(MIN_PASSWORD_LENGTH - 1)

    expect(
      validateNewPassword({ password: short, confirmPassword: short }).password,
    ).toBeDefined()
  })

  it('accepts a password of exactly the minimum length', () => {
    const exact = 'a'.repeat(MIN_PASSWORD_LENGTH)

    expect(
      validateNewPassword({ password: exact, confirmPassword: exact }).password,
    ).toBeUndefined()
  })

  it('rejects passwords that do not match', () => {
    const errors = validateNewPassword({
      password: 'longenough',
      confirmPassword: 'somethingelse',
    })

    expect(errors.confirmPassword).toBeDefined()
    expect(errors.password).toBeUndefined()
  })

  it('reports both fields when both are empty', () => {
    const errors = validateNewPassword({ password: '', confirmPassword: '' })

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
