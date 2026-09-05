'use client'

import { useState, type ReactNode } from 'react'
import { REPORT_GROUP_LABELS, type ReportGroup } from '@/lib/reports/categories'
import { ReportForm } from './report-form'
import { REPORT_THEMES } from './report-theme'

type GroupOption = {
  group: ReportGroup
  title: string
  description: string
  icon: ReactNode
}

const ICON_PROPS = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  className: 'h-9 w-9',
  'aria-hidden': true,
} as const

const GROUPS: GroupOption[] = [
  {
    group: 'entretien',
    title: REPORT_GROUP_LABELS.entretien,
    description: 'Arbres, sentiers, infrastructures, signalisation…',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
        <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
      </svg>
    ),
  },
  {
    group: 'citoyen',
    title: REPORT_GROUP_LABELS.citoyen,
    description: 'Respect du règlement : vélos, chien, feux de camp…',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
        <path d="M9 18h6" />
        <path d="M10 22h4" />
      </svg>
    ),
  },
  {
    group: 'faune_flore',
    title: REPORT_GROUP_LABELS.faune_flore,
    description: 'Observation d’espèces animales ou végétales',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M16 7h.01" />
        <path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20" />
        <path d="m20 7 2 .5-2 .5" />
        <path d="M10 18v3" />
        <path d="M14 17.75V21" />
        <path d="M7 18a6 6 0 0 0 3.84-10.61" />
      </svg>
    ),
  },
]

export function ReportFlow({
  photoRequired,
  citizen = false,
  onFillingChange,
}: {
  photoRequired: boolean
  citizen?: boolean
  onFillingChange?: (filling: boolean) => void
}) {
  const [group, setGroup] = useState<ReportGroup | null>(null)
  const [returning, setReturning] = useState(false)
  const groups = citizen
    ? GROUPS.filter(({ group: value }) => value !== 'faune_flore')
    : GROUPS

  if (group === null) {
    return (
      <div
        className={`mx-auto flex w-full animate-in flex-col gap-3 fade-in duration-250 motion-reduce:animate-none ${
          returning ? 'slide-in-from-left-4' : ''
        }`}
      >
        {groups.map(({ group: value, title, description, icon }, index) => {
          const theme = REPORT_THEMES[value]

          return (
            <button
              key={value}
              type="button"
              onClick={() => {
                setGroup(value)
                onFillingChange?.(true)
              }}
              style={{ animationDelay: `${index * 70}ms` }}
              className={`group flex w-full touch-manipulation animate-in items-center gap-4 rounded-2xl border border-transparent px-4 py-6 text-left shadow-sm transition-[border-color,background-color,transform] duration-150 ease-out fill-mode-backwards fade-in slide-in-from-bottom-3 focus-visible:ring-2 focus-visible:outline-none active:scale-[0.99] motion-reduce:animate-none motion-reduce:transition-none motion-reduce:active:scale-100 sm:px-5 sm:py-7 ${theme.card} ${theme.cardHover} ${theme.ring}`}
            >
              <span
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl transition-colors duration-150 ${theme.chip} ${theme.chipActive}`}
              >
                {icon}
              </span>
              <span className="min-w-0">
                <span className="block font-heading text-xl text-canopee-forest sm:text-2xl">
                  {title}
                </span>
                <span className="block text-sm text-canopee-forest/70">
                  {description}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-250 motion-reduce:animate-none">
      <ReportForm
        group={group}
        onBack={() => {
          setReturning(true)
          setGroup(null)
          onFillingChange?.(false)
        }}
        photoRequired={photoRequired}
        citizen={citizen}
      />
    </div>
  )
}
