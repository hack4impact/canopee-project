export function trackMapLoad(): void {
  fetch('/api/map-loads', { method: 'POST' }).catch(() => {})
}
