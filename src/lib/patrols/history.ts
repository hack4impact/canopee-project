const monthFormatter = new Intl.DateTimeFormat('fr-CA', {
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Toronto',
})

export function formatPatrolMonth(date: Date): string {
  const label = monthFormatter.format(date)

  return label.charAt(0).toUpperCase() + label.slice(1)
}

export type MonthlyPatrol = {
  startedAt: Date
  distanceMetres: number
}

export type PatrolMonth<T extends MonthlyPatrol> = {
  label: string
  items: T[]
  distanceMetres: number
}

export function sectionPatrolsByMonth<T extends MonthlyPatrol>(
  items: readonly T[],
): PatrolMonth<T>[] {
  const months: PatrolMonth<T>[] = []

  for (const item of items) {
    const label = formatPatrolMonth(item.startedAt)
    const current = months.at(-1)

    if (current?.label === label) {
      current.items.push(item)
      current.distanceMetres += item.distanceMetres
      continue
    }

    months.push({
      label,
      items: [item],
      distanceMetres: item.distanceMetres,
    })
  }

  return months
}
