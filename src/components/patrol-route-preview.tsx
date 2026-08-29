import {
  hasDrawableRoute,
  routeBounds,
  toLineCoordinates,
  type RoutePoint,
} from '@/lib/patrols/polyline'

const WIDTH = 416
const HEIGHT = 128
const PADDING_X = 24
const PADDING_TOP = 16
const PADDING_BOTTOM = 20
const MIN_SPAN = 1e-6
const GROUND = '#eef0e0'

type Trace = {
  path: string
  start: [number, number]
  end: [number, number]
}

/** Only used to keep the hatch pattern id unique if two ever render together. */
function keyOf(value: string): string {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return (hash >>> 0).toString(36)
}

function project(points: readonly RoutePoint[]): Trace | null {
  if (!hasDrawableRoute(points)) {
    return null
  }

  const coordinates = toLineCoordinates(points)
  const bounds = routeBounds(coordinates)

  if (!bounds) {
    return null
  }

  const [[west, south], [east, north]] = bounds

  // A degree of longitude is shorter than a degree of latitude this far north,
  // so the trace would lean without this.
  const squeeze = Math.cos((((south + north) / 2) * Math.PI) / 180)
  const spanX = Math.max((east - west) * squeeze, MIN_SPAN)
  const spanY = Math.max(north - south, MIN_SPAN)
  const availableX = WIDTH - PADDING_X * 2
  const availableY = HEIGHT - PADDING_TOP - PADDING_BOTTOM
  const scale = Math.min(availableX / spanX, availableY / spanY)
  const offsetX = PADDING_X + (availableX - spanX * scale) / 2
  const offsetY = PADDING_BOTTOM + (availableY - spanY * scale) / 2

  const projected: [number, number][] = coordinates.map(
    ([longitude, latitude]) => [
      offsetX + (longitude - west) * squeeze * scale,
      HEIGHT - offsetY - (latitude - south) * scale,
    ],
  )

  return {
    path: projected
      .map(
        ([x, y], index) =>
          `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`,
      )
      .join(' '),
    start: projected[0],
    end: projected[projected.length - 1],
  }
}

/**
 * The patrol's real recorded path over a hatch texture. The hatch is
 * decorative, not terrain — this is deliberately not a map, so nothing here
 * bills a Mapbox load and it renders with no network at all.
 */
export function PatrolRoutePreview({
  points,
  seed,
  className,
}: {
  points: readonly RoutePoint[]
  seed: string
  className?: string
}) {
  const trace = project(points)
  const pattern = `hatch-${keyOf(seed)}`

  return (
    <span className={className} style={{ backgroundColor: GROUND }}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
        role="img"
        aria-label="Trajet de la dernière patrouille"
      >
        <defs>
          <pattern
            id={pattern}
            width={9}
            height={9}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={9}
              stroke="var(--color-canopee-forest)"
              strokeWidth={1.3}
              opacity={0.09}
            />
          </pattern>
        </defs>

        {/* Oversized so the hatch still fills the card when the viewBox letterboxes. */}
        <rect
          x={-120}
          y={-60}
          width={WIDTH + 240}
          height={HEIGHT + 120}
          fill={GROUND}
        />
        <rect
          x={-120}
          y={-60}
          width={WIDTH + 240}
          height={HEIGHT + 120}
          fill={`url(#${pattern})`}
        />

        {trace && (
          <>
            <path
              d={trace.path}
              fill="none"
              stroke={GROUND}
              strokeWidth={8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={trace.path}
              fill="none"
              stroke="var(--color-canopee-green)"
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle
              cx={trace.start[0]}
              cy={trace.start[1]}
              r={5}
              fill="var(--color-canopee-forest)"
              stroke={GROUND}
              strokeWidth={2.5}
            />
            <circle
              cx={trace.end[0]}
              cy={trace.end[1]}
              r={5}
              fill="var(--color-canopee-coral)"
              stroke={GROUND}
              strokeWidth={2.5}
            />
          </>
        )}
      </svg>
    </span>
  )
}
