import type { Metadata } from 'next'
import { SignupForm } from './signup-form'

export const metadata: Metadata = {
  title: 'Sign up | Canopée',
}

export default function SignupPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-sm flex-col gap-8 px-6 py-24">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Create an account
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            New accounts start as volunteers and need an admin to approve them.
          </p>
        </header>

        <SignupForm />
      </main>
    </div>
  )
}
