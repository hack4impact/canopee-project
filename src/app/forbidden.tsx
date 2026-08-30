import Link from 'next/link'

export default function Forbidden() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex max-w-md flex-col gap-4 px-6 py-24 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Forbidden
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          You do not have permission to view this page.
        </p>
        <Link
          href="/carte"
          className="text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400"
        >
          Back to home
        </Link>
      </main>
    </div>
  )
}
