import Image from 'next/image'
import Link from 'next/link'

export function TopPanel() {
  return (
    <header className="fixed top-[calc(1rem+env(safe-area-inset-top))] left-1/2 z-50 w-[min(96%,1200px)] -translate-x-1/2">
      <Link
        href="/signaler"
        className="flex touch-manipulation items-center justify-between gap-3 rounded-2xl border border-white/10 bg-canopee-forest/75 px-5 py-4 text-canopee-cream shadow-md shadow-black/30 backdrop-blur-sm transition-colors duration-150 hover:bg-canopee-forest/90 focus-visible:ring-2 focus-visible:ring-canopee-lime focus-visible:outline-none"
      >
        <span className="flex items-center gap-3">
          <Image
            src="/canopee_icone.png"
            alt=""
            width={173}
            height={173}
            className="h-11 w-auto"
          />
          <span className="flex flex-col gap-1">
            <span className="text-sm text-canopee-cream/80">
              Un problème sur le terrain ?
            </span>
            <span className="font-heading text-xl leading-none">Signaler</span>
          </span>
        </span>

        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-canopee-cream text-canopee-forest">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
            aria-hidden="true"
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
        </span>
      </Link>
    </header>
  )
}
