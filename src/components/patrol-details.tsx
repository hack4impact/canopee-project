import {
  formatDistance,
  formatDuration,
  formatPatrolTime,
} from '@/lib/patrols/format'

const DASH = '—'

type PatrolDetailsProps = {
  startedAt: Date
  endedAt: Date | null
  durationSeconds: number | null
  distanceMetres: number | null
}

export function PatrolDetails({
  startedAt,
  endedAt,
  durationSeconds,
  distanceMetres,
}: PatrolDetailsProps) {
  const bubbles = [
    { label: 'Départ', value: formatPatrolTime(startedAt) },
    { label: 'Arrivée', value: endedAt ? formatPatrolTime(endedAt) : DASH },
    { label: 'Durée', value: formatDuration(durationSeconds) },
    {
      label: 'Distance',
      value: distanceMetres === null ? DASH : formatDistance(distanceMetres),
    },
  ]

  return (
    <div className="absolute inset-x-2 bottom-4 z-10 flex justify-center gap-1.5 sm:gap-2">
      {bubbles.map((bubble) => (
        <div
          key={bubble.label}
          className="flex flex-col items-center rounded-xl bg-canopee-forest px-2.5 py-1.5 text-canopee-cream shadow-lg ring-1 ring-black/5 sm:rounded-2xl sm:px-4 sm:py-2"
        >
          <span className="text-sm font-semibold whitespace-nowrap sm:text-base">
            {bubble.value}
          </span>
          <span className="text-[10px] font-medium tracking-wide text-canopee-cream/70 uppercase sm:text-xs">
            {bubble.label}
          </span>
        </div>
      ))}
    </div>
  )
}
