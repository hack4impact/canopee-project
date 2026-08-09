export type GeolocationNotice = {
  message: string
}

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
      "Impossible d'obtenir votre position. La carte reste centrée sur les secteurs boisés de Laval.",
  }
}

export function isGeolocationAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator
}
