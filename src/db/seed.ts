import 'dotenv/config'
import { db, users } from './index'

async function seed() {
  const existing = await db.select().from(users)
  if (existing.length > 0) {
    console.log(
      `users table already has ${existing.length} row(s), skipping seed`,
    )
    process.exit(0)
  }

  await db.insert(users).values([
    { fullName: 'Ada Lovelace', phone: '+1-555-0100' },
    { fullName: 'Alan Turing', phone: '+1-555-0101' },
    { fullName: 'Grace Hopper', phone: '+1-555-0102' },
  ])

  console.log('Seeded 3 users')
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
