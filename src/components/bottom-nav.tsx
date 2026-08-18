'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

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

const LINKS: NavLink[] = [
  {
    href: '/',
    label: 'Accueil',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
        <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </svg>
    ),
  },
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
    href: '/patrouilles',
    label: 'Patrouiller',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />
      </svg>
    ),
  },
  {
    href: '/signaler',
    label: 'Signaler',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
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

  if (link.href === '/patrouilles') {
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
    <nav className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-canopee-forest/80 p-1.5 shadow-xl shadow-black/30 ring-1 ring-white/10 backdrop-blur-sm">
      {LINKS.map((link, index) => {
        const isActive = bestScore >= 0 && scores[index] === bestScore

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? 'page' : undefined}
            className={`group flex min-w-16 flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-[10px] font-semibold tracking-wide whitespace-nowrap transition-colors duration-150 focus-visible:outline-none ${
              isActive
                ? 'text-canopee-cream'
                : 'text-canopee-cream/60 hover:text-canopee-cream focus-visible:text-canopee-cream'
            }`}
          >
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-150 ${
                isActive
                  ? 'bg-canopee-cream text-canopee-forest'
                  : 'group-hover:bg-white/10 group-focus-visible:bg-white/10'
              }`}
            >
              {link.icon}
            </span>
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
