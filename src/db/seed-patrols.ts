import 'dotenv/config'
import { db, patrolPoints, patrols, users } from './index'

// Routes trace walking paths through Laval's wooded areas, with points roughly
// 40-80m apart. Patrols 1 and 3 share a stretch of Bois Papineau on purpose so
// the frequency heatmap has overlapping traffic to render.
const MOCK_PATROLS = [
  {
    label: 'Bois Papineau loop',
    role: 'volunteer' as const,
    startedAt: new Date('2026-07-12T09:15:00Z'),
    intervalSeconds: 180,
    route: [
      ['45.588500', '-73.723000'],
      ['45.588900', '-73.722300'],
      ['45.589300', '-73.721600'],
      ['45.589800', '-73.721000'],
      ['45.590200', '-73.720300'],
      ['45.590700', '-73.719700'],
      ['45.591100', '-73.719000'],
      ['45.591400', '-73.718200'],
      ['45.591000', '-73.717600'],
      ['45.590500', '-73.717900'],
      ['45.590000', '-73.718400'],
      ['45.589500', '-73.719000'],
      ['45.589000', '-73.719700'],
      ['45.588600', '-73.720400'],
      ['45.588400', '-73.721200'],
      ['45.588400', '-73.722100'],
    ],
  },
  {
    label: "Bois de l'Equerre north trail",
    role: 'pro' as const,
    startedAt: new Date('2026-07-26T14:00:00Z'),
    intervalSeconds: 240,
    route: [
      ['45.605800', '-73.763400'],
      ['45.606200', '-73.762700'],
      ['45.606700', '-73.762100'],
      ['45.607200', '-73.761500'],
      ['45.607600', '-73.760800'],
      ['45.608100', '-73.760200'],
      ['45.608500', '-73.759500'],
      ['45.608200', '-73.758700'],
      ['45.607700', '-73.758400'],
      ['45.607200', '-73.758900'],
      ['45.606700', '-73.759500'],
      ['45.606300', '-73.760200'],
      ['45.605900', '-73.760900'],
      ['45.605700', '-73.761700'],
    ],
  },
  {
    label: 'Bois Papineau east approach',
    role: 'admin' as const,
    startedAt: new Date('2026-08-03T08:30:00Z'),
    intervalSeconds: 150,
    route: [
      ['45.587900', '-73.726500'],
      ['45.588300', '-73.725700'],
      ['45.588700', '-73.725000'],
      ['45.589100', '-73.724200'],
      ['45.589400', '-73.723400'],
      ['45.589800', '-73.722700'],
      ['45.590100', '-73.721900'],
      ['45.590200', '-73.720300'],
      ['45.590700', '-73.719700'],
      ['45.591100', '-73.719000'],
      ['45.591500', '-73.718400'],
      ['45.591900', '-73.717700'],
      ['45.592100', '-73.718500'],
      ['45.591700', '-73.719200'],
      ['45.591200', '-73.719900'],
    ],
  },
] as const

// The patroller presses "end" shortly after the last point is recorded.
const END_DELAY_SECONDS = 60

function addSeconds(date: Date, seconds: number) {
  return new Date(date.getTime() + seconds * 1000)
}

async function seedPatrols() {
  const existing = await db.select().from(patrols)
  if (existing.length > 0) {
    console.log(
      `patrols table already has ${existing.length} row(s), skipping seed`,
    )
    process.exit(0)
  }

  // Sorted so repeated runs assign the same users in the same order.
  const allUsers = (await db.select().from(users)).sort((a, b) =>
    a.email.localeCompare(b.email),
  )
  if (allUsers.length === 0) {
    console.error('No users found. Run `npm run db:seed` first.')
    process.exit(1)
  }

  // Citizens cannot patrol, so every patrol needs a real user. Prefer the
  // intended role, then any user not already patrolling, so the demo spreads
  // across accounts even when a role was never seeded.
  const assigned = new Set<string>()
  const pickUser = (role: (typeof MOCK_PATROLS)[number]['role']) => {
    const user =
      allUsers.find((u) => u.role === role && !assigned.has(u.id)) ??
      allUsers.find((u) => !assigned.has(u.id)) ??
      allUsers[0]
    assigned.add(user.id)
    return user
  }

  let pointCount = 0

  for (const mock of MOCK_PATROLS) {
    const user = pickUser(mock.role)

    const lastPointAt = addSeconds(
      mock.startedAt,
      (mock.route.length - 1) * mock.intervalSeconds,
    )

    const [patrol] = await db
      .insert(patrols)
      .values({
        userId: user.id,
        startedAt: mock.startedAt,
        endedAt: addSeconds(lastPointAt, END_DELAY_SECONDS),
      })
      .returning()

    await db.insert(patrolPoints).values(
      mock.route.map(([latitude, longitude], i) => ({
        patrolId: patrol.id,
        latitude,
        longitude,
        recordedAt: addSeconds(mock.startedAt, i * mock.intervalSeconds),
      })),
    )

    pointCount += mock.route.length
    console.log(
      `Seeded "${mock.label}" for ${user.email} with ${mock.route.length} points`,
    )
  }

  console.log(
    `Seeded ${MOCK_PATROLS.length} completed patrols and ${pointCount} GPS points`,
  )
  process.exit(0)
}

seedPatrols().catch((err) => {
  console.error(err)
  process.exit(1)
})
