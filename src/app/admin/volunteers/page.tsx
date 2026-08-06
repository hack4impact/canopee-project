import Link from 'next/link'
import { getPendingUsers } from './actions'
import { VolunteerQueue } from './volunteer-queue'

export const dynamic = 'force-dynamic'

export default async function AdminVolunteersPage() {
  const pendingUsers = await getPendingUsers()

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col gap-8 px-6 py-24">
        <header className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
              File d&apos;approbation des bénévoles
            </h1>
            <Link
              href="/"
              className="text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400"
            >
              Accueil
            </Link>
          </div>
          <p className="text-zinc-600 dark:text-zinc-400">
            {pendingUsers.length} bénévole
            {pendingUsers.length === 1 ? '' : 's'} en attente d&apos;examen.
          </p>
        </header>

        <VolunteerQueue volunteers={pendingUsers} />
      </main>
    </div>
  )
}
