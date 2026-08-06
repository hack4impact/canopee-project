import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'test-email route is available',
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    return NextResponse.json({
      ok: true,
      received: body,
    })
  } catch {
    return NextResponse.json(
      {
        ok: true,
        received: {},
      },
      { status: 200 },
    )
  }
}
