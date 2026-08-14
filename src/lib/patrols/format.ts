const dateFormatter = new Intl.DateTimeFormat('fr-CA', {
  dateStyle: 'long',
  timeStyle: 'short',
})

const kilometreFormatter = new Intl.NumberFormat('fr-CA', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatPatrolDate(date: Date): string {
  return dateFormatter.format(date)
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) {
    return 'En cours'
  }

  const minutes = Math.round(seconds / 60)

  if (minutes < 60) {
    return `${minutes} min`
  }

  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`
}

export function formatDistance(metres: number): string {
  if (metres < 1000) {
    return `${Math.round(metres)} m`
  }

  return `${kilometreFormatter.format(metres / 1000)} km`
}
