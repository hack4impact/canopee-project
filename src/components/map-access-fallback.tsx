import Link from 'next/link'

export function MapAccessFallback() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <header className="mx-auto flex w-full max-w-6xl flex-col gap-2">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold tracking-tight text-black sm:text-3xl dark:text-zinc-50">
              Carte de Laval
            </h1>
            <Link
              href="/carte"
              className="shrink-0 text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400"
            >
              Carte
            </Link>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-950">
          <p className="text-base text-zinc-700 dark:text-zinc-300">
            La carte est réservée aux comptes bénévole, pro et admin.
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Connectez-vous ou créez un compte pour y accéder. Les citoyens sans
            compte peuvent signaler un problème sans se connecter.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href="/login"
              className="rounded bg-black px-4 py-2 text-sm text-white dark:bg-zinc-50 dark:text-black"
            >
              Se connecter
            </Link>
            <Link
              href="/signup"
              className="text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400"
            >
              Créer un compte
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
