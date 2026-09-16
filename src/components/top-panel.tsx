import Link from 'next/link'

export function TopPanel() {
  return (
    <header className="fixed top-[calc(1rem+env(safe-area-inset-top))] right-4 z-50">
      <Link
        href="/signaler"
        className="inline-flex h-12 touch-manipulation items-center justify-center gap-2 rounded-2xl bg-canopee-green px-4 text-sm font-bold whitespace-nowrap text-white shadow-xl shadow-black/30 ring-1 ring-white/10 transition-[background-color,transform] duration-150 ease-out hover:bg-canopee-forest focus-visible:ring-2 focus-visible:ring-canopee-lime focus-visible:outline-none active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.1}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5 shrink-0"
          aria-hidden="true"
        >
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
        Effectuer un signalement
      </Link>
    </header>
  )
}
