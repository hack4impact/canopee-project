import { db } from '@/db'
import { reports } from '@/db/schema'
import { formatEventNumber } from '@/lib/reports/format'

export async function GET() {
  const rows = await db.select().from(reports)

  const data = rows.map((report) => ({
    ...report,
    formattedEventNumber: formatEventNumber(report.eventNumber),
  }))

  return Response.json(data)
}
