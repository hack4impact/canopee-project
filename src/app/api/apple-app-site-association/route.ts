const APP_ID = 'HM4NNR63NU.org.reseaucanopee.app'

export async function GET() {
  return Response.json(
    {
      applinks: {
        details: [
          {
            appIDs: [APP_ID],
            components: [{ '/': '*' }],
          },
        ],
      },
    },
    {
      headers: {
        'content-type': 'application/json',
        'cache-control': 'public, max-age=3600',
      },
    },
  )
}
