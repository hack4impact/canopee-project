import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { logout } from '@/app/login/actions'
import { getCurrentUserProfile } from '@/lib/auth/current-user'
import { isApproved, isRejected } from '@/lib/auth/roles'

export const metadata: Metadata = {
  title: 'Approbation en attente | Canopée',
}

// Reads the caller's status on every request, so it must not be prerendered.
export const dynamic = 'force-dynamic'

const PENDING_COPY = {
  heading: "Votre compte est en attente d'approbation",
  body: "Un administrateur examine chaque nouveau compte de patrouilleur avant qu'il puisse être utilisé. Vous recevrez un courriel dès que votre compte sera approuvé, et vous pourrez vous connecter à partir de ce moment.",
}

const REJECTED_COPY = {
  heading: "Votre compte n'a pas été approuvé",
  body: "Un administrateur a examiné votre compte et ne l'a pas approuvé. Si vous pensez qu'il s'agit d'une erreur, répondez au courriel que vous avez reçu ou contactez Canopée.",
}

export default async function PendingPage() {
  const profile = await getCurrentUserProfile()

  if (!profile) {
    redirect('/login')
  }

  // Nothing to explain to an approved account — send it to the app.
  if (isApproved(profile)) {
    redirect('/')
  }

  const copy = isRejected(profile) ? REJECTED_COPY : PENDING_COPY

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-md flex-col gap-6 px-6 py-24">
        <header className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            {copy.heading}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">{copy.body}</p>
        </header>

        <p className="text-sm text-zinc-500">
          Connecté en tant que{' '}
          <span className="font-medium text-black dark:text-zinc-50">
            {profile.email}
          </span>
        </p>

        <form action={logout}>
          <button
            type="submit"
            className="rounded bg-black px-4 py-2 text-white dark:bg-zinc-50 dark:text-black"
          >
            Se déconnecter
          </button>
        </form>
      </main>
    </div>
  )
}
