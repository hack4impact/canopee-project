import type { Metadata } from 'next'
import { REDIRECT_PARAM, safeRedirectPath } from '@/lib/auth/routes'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Log in | Canopée',
}

export default async function LoginPage(props: PageProps<'/login'>) {
  const requested = (await props.searchParams)[REDIRECT_PARAM]

  // A repeated query parameter arrives as an array, and there is no sensible
  // way to pick one of them, so anything but a single string falls back to the
  // default. `safeRedirectPath` rejects the rest.
  const redirectTo = safeRedirectPath(
    typeof requested === 'string' ? requested : undefined,
  )

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-sm flex-col gap-8 px-6 py-24">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Log in
          </h1>
        </header>

        <LoginForm redirectTo={redirectTo} />
      </main>
    </div>
  )
}
