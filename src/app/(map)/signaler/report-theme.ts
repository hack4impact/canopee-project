import type { ReportGroup } from '@/lib/reports/categories'

export type ReportTheme = {
  accent: string
  bar: string
  chip: string
  chipActive: string
  card: string
  cardHover: string
  ring: string
  option: string
  optionActive: string
  barPast: string
  barIdle: string
}

export const REPORT_THEMES: Record<ReportGroup, ReportTheme> = {
  entretien: {
    accent: 'text-canopee-coral',
    bar: 'bg-canopee-coral',
    chip: 'bg-canopee-coral/10 text-canopee-coral',
    chipActive:
      'group-hover:bg-canopee-coral group-focus-visible:bg-canopee-coral group-hover:text-white group-focus-visible:text-white',
    card: 'bg-canopee-coral/10',
    cardHover: 'hover:border-canopee-coral hover:bg-canopee-coral/20',
    ring: 'focus-visible:ring-canopee-coral/40',
    option:
      'border-canopee-coral/25 bg-white text-canopee-forest hover:border-canopee-coral/60',
    optionActive:
      'border-canopee-coral bg-canopee-coral/10 text-canopee-forest',
    barPast: 'bg-canopee-coral/50',
    barIdle: 'bg-canopee-coral/15',
  },
  citoyen: {
    accent: 'text-canopee-sky-dark',
    bar: 'bg-canopee-sky-dark',
    chip: 'bg-canopee-sky/15 text-canopee-sky-dark',
    chipActive:
      'group-hover:bg-canopee-sky-dark group-focus-visible:bg-canopee-sky-dark group-hover:text-white group-focus-visible:text-white',
    card: 'bg-canopee-sky/15',
    cardHover: 'hover:border-canopee-sky-dark hover:bg-canopee-sky/25',
    ring: 'focus-visible:ring-canopee-sky-dark/40',
    option:
      'border-canopee-sky-dark/25 bg-white text-canopee-forest hover:border-canopee-sky-dark/60',
    optionActive:
      'border-canopee-sky-dark bg-canopee-sky/15 text-canopee-forest',
    barPast: 'bg-canopee-sky-dark/50',
    barIdle: 'bg-canopee-sky-dark/15',
  },
  faune_flore: {
    accent: 'text-canopee-green',
    bar: 'bg-canopee-green',
    chip: 'bg-canopee-green/10 text-canopee-green',
    chipActive:
      'group-hover:bg-canopee-green group-focus-visible:bg-canopee-green group-hover:text-white group-focus-visible:text-white',
    card: 'bg-canopee-green/10',
    cardHover: 'hover:border-canopee-green hover:bg-canopee-green/20',
    ring: 'focus-visible:ring-canopee-green/40',
    option:
      'border-canopee-green/25 bg-white text-canopee-forest hover:border-canopee-green/60',
    optionActive:
      'border-canopee-green bg-canopee-green/10 text-canopee-forest',
    barPast: 'bg-canopee-green/50',
    barIdle: 'bg-canopee-green/15',
  },
}
