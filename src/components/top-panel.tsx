import Link from 'next/link'

export function TopPanel() {
  return (
    <header className="fixed top-[calc(1rem+env(safe-area-inset-top))] right-4 z-50">
      <Link
        href="/signaler"
        aria-label="Signaler un problème"
        className="flex size-14 touch-manipulation items-center justify-center rounded-2xl bg-canopee-cream text-canopee-coral shadow-[inset_0_0_0_2.5px_#f06053,0_6px_16px_-8px_rgba(150,40,30,0.65)] transition-[background-color,color,transform] duration-150 ease-out hover:bg-canopee-coral hover:text-canopee-cream focus-visible:ring-2 focus-visible:ring-canopee-forest focus-visible:outline-none active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.1}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
          aria-hidden="true"
        >
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      </Link>
    </header>
  )
}
