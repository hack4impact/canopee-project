const PACKAGE_NAME = 'org.reseaucanopee.app'

function fingerprints(): string[] {
  return (process.env.ANDROID_CERT_FINGERPRINTS ?? '')
    .split(',')
    .map((value) => value.trim().toUpperCase())
    .filter((value) => value.length > 0)
}

export async function GET() {
  const certs = fingerprints()

  if (certs.length === 0) {
    return Response.json([], {
      headers: { 'cache-control': 'no-store' },
    })
  }

  return Response.json(
    [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: PACKAGE_NAME,
          sha256_cert_fingerprints: certs,
        },
      },
    ],
    {
      headers: {
        'content-type': 'application/json',
        'cache-control': 'public, max-age=3600',
      },
    },
  )
}
