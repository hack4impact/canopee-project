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
const GROUND = '#f1f0e4'

type Trace = {
  path: string
  start: [number, number]
  end: [number, number]
}

/** Only used to keep the dot pattern id unique if two ever render together. */
function keyOf(value: string): string {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return (hash >>> 0).toString(36)
}

function project(
  points: readonly RoutePoint[],
  width: number,
  height: number,
): Trace | null {
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
  const paddingX = width * (PADDING_X / WIDTH)
  const paddingTop = height * (PADDING_TOP / HEIGHT)
  const paddingBottom = height * (PADDING_BOTTOM / HEIGHT)
  const availableX = width - paddingX * 2
  const availableY = height - paddingTop - paddingBottom
  const scale = Math.min(availableX / spanX, availableY / spanY)
  const offsetX = paddingX + (availableX - spanX * scale) / 2
  const offsetY = paddingBottom + (availableY - spanY * scale) / 2

  const projected: [number, number][] = coordinates.map(
    ([longitude, latitude]) => [
      offsetX + (longitude - west) * squeeze * scale,
      height - offsetY - (latitude - south) * scale,
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
 * The patrol's real recorded path over a dot grid. The grid is decorative, not
 * terrain — this is deliberately not a map, so nothing here bills a Mapbox load
 * and it renders with no network at all.
 */
export function PatrolRoutePreview({
  points,
  seed,
  className,
  width = WIDTH,
  height = HEIGHT,
  label = 'Trajet de la dernière patrouille',
}: {
  points: readonly RoutePoint[]
  seed: string
  className?: string
  width?: number
  height?: number
  label?: string
}) {
  const trace = project(points, width, height)
  const pattern = `dots-${keyOf(seed)}`

  return (
    <span className={className} style={{ backgroundColor: GROUND }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
        role="img"
        aria-label={label}
      >
        <defs>
          <pattern
            id={pattern}
            width={13}
            height={13}
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx={2}
              cy={2}
              r={1.1}
              fill="var(--color-canopee-forest)"
              opacity={0.16}
            />
          </pattern>
        </defs>

        {/* Oversized so the grid still fills the card when the viewBox letterboxes. */}
        <rect
          x={-120}
          y={-60}
          width={width + 240}
          height={height + 120}
          fill={GROUND}
        />
        <rect
          x={-120}
          y={-60}
          width={width + 240}
          height={height + 120}
          fill={`url(#${pattern})`}
        />

        {trace && (
          <>
            <path
              d={trace.path}
              fill="none"
              stroke={GROUND}
              strokeWidth={7.5}
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
