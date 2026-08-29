'use client'

import { Fragment, useState, useTransition, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { startPatrol } from '@/app/patrouilles/actions'
import { PatrolPicto } from '@/components/patrol-picto'
import { usePatrol } from '@/components/patrol-provider'

type NavLink = {
  href: string
  label: string
  icon: ReactNode
  related?: string[]
}

const ICON_PROPS = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  className: 'h-[22px] w-[22px]',
  'aria-hidden': true,
} as const

const ITEM_BASE =
  'group flex min-w-16 flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-semibold tracking-wide whitespace-nowrap transition-colors duration-150 focus-visible:outline-none'

const LINKS: NavLink[] = [
  {
    href: '/carte',
    label: 'Carte',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" />
        <path d="M15 5.764v15" />
        <path d="M9 3.236v15" />
      </svg>
    ),
  },
  {
    href: '/profil',
    label: 'Profil',
    related: ['/patrouilles/historique'],
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="12" cy="8" r="5" />
        <path d="M20 21a8 8 0 0 0-16 0" />
      </svg>
    ),
  },
]

/** How closely a link matches, so /patrouilles/historique lights Profil alone. */
function matchLength(pathname: string, link: NavLink): number {
  let longest = -1

  for (const path of [link.href, ...(link.related ?? [])]) {
    if (pathname === path || pathname.startsWith(`${path}/`)) {
      longest = Math.max(longest, path.length)
    }
  }

  return longest
}

const PATROL_SUMMARY_PATTERN =
  /^\/patrouilles\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function originMatch(
  pathname: string,
  link: NavLink,
  from: string | null,
): boolean | null {
  if (from !== 'patrouille' && from !== 'profil') {
    return null
  }

  const isHistory = pathname === '/patrouilles/historique'
  const isSummary = PATROL_SUMMARY_PATTERN.test(pathname)

  if (!isHistory && !isSummary) {
    return null
  }

  if (link.href === '/profil') {
    return from === 'profil'
  }

  if (link.href === '/carte') {
    return from === 'patrouille'
  }

  return null
}

export function BottomNav() {
  const pathname = usePathname()
  const from = useSearchParams().get('from')
  const scores = LINKS.map((link) => {
    const explicit = originMatch(pathname, link, from)

    if (explicit !== null) {
      return explicit ? 1_000 : -1
    }

    return matchLength(pathname, link)
  })
  const bestScore = Math.max(...scores)

  return (
    <nav className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 z-50 flex -translate-x-1/2 items-stretch gap-1 px-2 py-1.5">
      {/* The bar's own backdrop-blur would establish a backdrop root and cancel
          the docked patrol shell's blur, so it lives on this layer instead. */}
      <span
        aria-hidden
        className="absolute inset-0 -z-10 rounded-2xl bg-canopee-forest/80 shadow-xl shadow-black/30 ring-1 ring-white/10 backdrop-blur-sm"
      />

      {LINKS.map((link, index) => {
        const isActive = bestScore >= 0 && scores[index] === bestScore

        return (
          <Fragment key={link.href}>
            <Link
              href={link.href}
              aria-current={isActive ? 'page' : undefined}
              className={`${ITEM_BASE} ${
                isActive
                  ? 'text-canopee-cream'
                  : 'text-canopee-cream/60 hover:text-canopee-cream focus-visible:text-canopee-cream'
              }`}
            >
              <span className="flex flex-col items-center gap-1">
                {link.icon}
                <span
                  className={`h-0.5 w-[18px] bg-canopee-cream transition-opacity duration-150 ${
                    isActive ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              </span>
              {link.label}
            </Link>

            {link.href === '/carte' && <PatrolNavItem />}
          </Fragment>
        )
      })}
    </nav>
  )
}

/**
 * The middle slot. Idle it is the raised start button; while a patrol runs it is
 * the anchor the patrol shell renders into, so the nav and the running patrol
 * read as one object instead of two floating ones.
 */
function PatrolNavItem() {
  const { state, refresh, setDock } = usePatrol()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  function handleClick() {
    setMessage(null)

    startTransition(async () => {
      const result = await startPatrol()
      setMessage(result.message ?? null)

      if (!result.message) {
        void refresh()
      }
    })
  }

  if (state.status === 'unavailable') {
    return null
  }

  const running = state.status === 'active'

  return (
    <span
      className={`relative flex shrink-0 flex-col items-center justify-end px-2 py-1.5 text-[10px] font-semibold tracking-wide whitespace-nowrap text-canopee-cream/85 transition-[width] duration-300 ease-out motion-reduce:transition-none ${
        running ? 'w-40' : 'w-20'
      }`}
    >
      {!running && (
        <button
          type="button"
          onClick={handleClick}
          disabled={pending}
          aria-label="Démarrer une patrouille"
          className="absolute bottom-8 left-1/2 flex h-14 w-14 -translate-x-1/2 animate-pop-in touch-manipulation items-center justify-center rounded-2xl bg-gradient-to-b from-[#2fc46c] to-canopee-green text-white shadow-[0_0_0_5px_rgba(0,69,35,0.92),inset_0_1px_0_rgba(255,255,255,0.35),0_10px_20px_-8px_rgba(0,69,35,0.9)] transition-[filter,transform] duration-150 ease-out hover:brightness-110 focus-visible:ring-2 focus-visible:ring-canopee-lime focus-visible:outline-none active:scale-[0.97] disabled:opacity-60 motion-reduce:transition-none"
        >
          <PatrolPicto name="hiker" className="h-6 w-6" />
        </button>
      )}

      <span
        ref={setDock}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      />

      {running ? 'En cours' : pending ? 'Départ…' : 'Patrouiller'}

      {message && (
        <p
          role="alert"
          className="absolute bottom-full left-1/2 mb-3 w-max max-w-56 -translate-x-1/2 rounded-lg bg-canopee-cream/95 px-3 py-1 text-center text-xs font-medium text-canopee-coral-dark shadow-md"
        >
          {message}
        </p>
      )}
    </span>
  )
}
