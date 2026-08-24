import type { ReportGroup } from '@/lib/reports/categories'

export type ReportTheme = {
  accent: string
  bar: string
  chip: string
  chipActive: string
  cardHover: string
  ring: string
}

export const REPORT_THEMES: Record<ReportGroup, ReportTheme> = {
  entretien: {
    accent: 'text-canopee-coral',
    bar: 'bg-canopee-coral',
    chip: 'bg-canopee-coral/10 text-canopee-coral',
    chipActive:
      'group-hover:bg-canopee-coral group-focus-visible:bg-canopee-coral group-hover:text-white group-focus-visible:text-white',
    cardHover: 'hover:border-canopee-coral hover:bg-canopee-coral/5',
    ring: 'focus-visible:ring-canopee-coral/40',
  },
  citoyen: {
    accent: 'text-canopee-sky-dark',
    bar: 'bg-canopee-sky-dark',
    chip: 'bg-canopee-sky/15 text-canopee-sky-dark',
    chipActive:
      'group-hover:bg-canopee-sky-dark group-focus-visible:bg-canopee-sky-dark group-hover:text-white group-focus-visible:text-white',
    cardHover: 'hover:border-canopee-sky-dark hover:bg-canopee-sky/10',
    ring: 'focus-visible:ring-canopee-sky-dark/40',
  },
  faune_flore: {
    accent: 'text-canopee-green',
    bar: 'bg-canopee-green',
    chip: 'bg-canopee-green/10 text-canopee-green',
    chipActive:
      'group-hover:bg-canopee-green group-focus-visible:bg-canopee-green group-hover:text-white group-focus-visible:text-white',
    cardHover: 'hover:border-canopee-green hover:bg-canopee-green/5',
    ring: 'focus-visible:ring-canopee-green/40',
  },
}
