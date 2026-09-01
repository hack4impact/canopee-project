export function formatEventNumber(n: number): string {
  return `# ${String(n).padStart(4, '0')}`
}

const pinDateFormatter = new Intl.DateTimeFormat('fr-CA', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function formatPinDate(iso: string): string {
  const date = new Date(iso)

  return Number.isNaN(date.getTime()) ? '' : pinDateFormatter.format(date)
}
