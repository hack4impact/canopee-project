export type GeolocationNotice = {
  message: string
}

/** User-facing copy when geolocation fails. Keeps the map usable. */
export function getGeolocationNotice(
  error: Pick<GeolocationPositionError, 'code'>,
): GeolocationNotice {
  if (error.code === 1) {
    return {
      message:
        'Localisation refusée. La carte reste centrée sur les secteurs boisés de Laval.',
    }
  }

  if (error.code === 2) {
    return {
      message:
        'Position indisponible. La carte reste centrée sur les secteurs boisés de Laval.',
    }
  }

  return {
    message:
      'Impossible d’obtenir votre position. La carte reste centrée sur les secteurs boisés de Laval.',
  }
}

/** Returns true when the browser exposes the Geolocation API. */
export function isGeolocationAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator
}
