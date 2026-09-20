const APP_ID = '8C3V6FP6FP.org.reseaucanopee.mobile'

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
