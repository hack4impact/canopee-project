import { describe, expect, it } from 'vitest'
import { db } from '@/db'
import { reports } from '@/db/schema'

// Temporary workaround because we don't want to run this test on CI since it requires a database connection.
// We can remove this once we implement a test database for CI.
const describeDb = describe.skipIf(!process.env.DATABASE_URL)

describeDb('event_number concurrency', () => {
  it('assigns unique event_numbers across 10 parallel inserts', async () => {
    const insert = () =>
      db
        .insert(reports)
        .values({
          reporterEmail: 'test@canopee.org',
          category: 'dangerous_tree',
          latitude: '48.8566',
          longitude: '2.3522',
        })
        .returning({ eventNumber: reports.eventNumber })

    const results = await Promise.all(Array.from({ length: 10 }, insert))
    const numbers = results.map((r) => r[0].eventNumber)
    const unique = new Set(numbers)

    expect(unique.size).toBe(10)
  })
})
