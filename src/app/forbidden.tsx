import Link from 'next/link'

export default function Forbidden() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-canopee-forest px-6 py-16 font-sans">
      <main className="w-full max-w-sm rounded-3xl bg-canopee-cream p-8 text-center shadow-2xl shadow-black/40 sm:p-10">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-canopee-forest">
          Accès refusé
        </h1>
        <p className="mt-4 text-sm text-canopee-forest/80">
          Vous n&apos;avez pas les permissions nécessaires pour consulter cette
          page.
        </p>
        <Link
          href="/carte"
          className="mt-8 block w-full rounded-lg bg-canopee-green px-4 py-2.5 font-bold text-white shadow-sm transition-[background-color] duration-150 ease-out hover:bg-canopee-forest"
        >
          Retour à la carte
        </Link>
      </main>
    </div>
  )
}
