'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

const CONFIRM_MESSAGE =
  'Une patrouille est en cours. Quitter cette page arrête l’enregistrement du trajet. Continuer ?'

type LeavePatrolLinkProps = {
  href: string
  isPatrolActive: boolean
  className?: string
  children: ReactNode
}

/** `beforeunload` never fires on a client-side navigation, so `onNavigate` covers it. */
export function LeavePatrolLink({
  href,
  isPatrolActive,
  className,
  children,
}: LeavePatrolLinkProps) {
  return (
    <Link
      href={href}
      className={className}
      onNavigate={(event) => {
        if (isPatrolActive && !window.confirm(CONFIRM_MESSAGE)) {
          event.preventDefault()
        }
      }}
    >
      {children}
    </Link>
  )
}
