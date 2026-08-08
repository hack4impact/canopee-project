/** Fire-and-forget ping recording a successful map render, for the
 * self-tracked usage counter behind /api/cron/mapbox-usage. Never throws —
 * a failed usage ping should never break the map. */
export function trackMapLoad(): void {
  fetch('/api/map-loads', { method: 'POST' }).catch(() => {})
}
