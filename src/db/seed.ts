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
    {
      authUserId: crypto.randomUUID(),
      email: 'ada@example.com',
      role: 'admin',
      status: 'approved',
    },
    {
      authUserId: crypto.randomUUID(),
      email: 'alan@example.com',
      role: 'pro',
      status: 'approved',
    },
    {
      authUserId: crypto.randomUUID(),
      email: 'grace@example.com',
      role: 'volunteer',
    },
  ])

  console.log('Seeded 3 users')
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
