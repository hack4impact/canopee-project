import {
  reportGroupOfCategory,
  type ReportCategory,
  type ReportGroup,
} from '@/lib/reports/categories'

export const REPORT_GROUP_COLORS: Record<ReportGroup, string> = {
  entretien: '#f06053',
  citoyen: '#3f9bc0',
  faune_flore: '#17aa55',
}

export const REPORT_GROUP_ICON_PATHS: Record<ReportGroup, readonly string[]> = {
  entretien: [
    'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z',
    'M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12',
  ],
  citoyen: [
    'M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5',
    'M9 18h6',
    'M10 22h4',
  ],
  faune_flore: [
    'M16 7h.01',
    'M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20',
    'm20 7 2 .5-2 .5',
    'M10 18v3',
    'M14 17.75V21',
    'M7 18a6 6 0 0 0 3.84-10.61',
  ],
}

export function reportGroupColor(category: ReportCategory): string {
  return REPORT_GROUP_COLORS[reportGroupOfCategory(category)]
}

const PIN_WIDTH = 32

const PIN_HEIGHT = 42

const PIN_OUTLINE = '#f6f4df'

export const REPORT_PIN_SIZE = { width: PIN_WIDTH, height: PIN_HEIGHT }

export function reportPinSvg(group: ReportGroup, scale = 2): string {
  const color = REPORT_GROUP_COLORS[group]
  const icon = REPORT_GROUP_ICON_PATHS[group]
    .map((d) => `<path d="${d}" />`)
    .join('')

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PIN_WIDTH * scale}" height="${PIN_HEIGHT * scale}" viewBox="0 0 ${PIN_WIDTH} ${PIN_HEIGHT}">`,
    `<path d="M16 41C16 41 29 25.5 29 16A13 13 0 1 0 3 16C3 25.5 16 41 16 41Z" fill="${color}" stroke="${PIN_OUTLINE}" stroke-width="1.5" />`,
    '<circle cx="16" cy="16" r="8.5" fill="#ffffff" />',
    `<g transform="translate(10 10) scale(0.5)" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${icon}</g>`,
    '</svg>',
  ].join('')
}
