import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { db, reports, users } from './index'

const MOCK_REPORTS = [
  {
    latitude: '45.592100',
    longitude: '-73.718500',
    category: 'dangerous_tree' as const,
    resolvedAt: null,
    reporterEmail: 'citoyen.laval@example.com',
  },
  {
    latitude: '45.585300',
    longitude: '-73.731200',
    category: 'damaged_infrastructure' as const,
    resolvedAt: new Date('2026-07-15T14:30:00Z'),
    reporterEmail: 'marie.dubois@example.com',
  },
  {
    latitude: '45.589800',
    longitude: '-73.715600',
    category: 'oiseau' as const,
    resolvedAt: null,
    reporterEmail: 'observateur.faune@example.com',
  },
  {
    latitude: '45.583400',
    longitude: '-73.726800',
    category: 'plante_vasculaire' as const,
    resolvedAt: new Date('2026-06-20T09:00:00Z'),
    reporterEmail: 'botaniste@example.com',
  },
  {
    latitude: '45.591500',
    longitude: '-73.722100',
    category: 'unleashed_dog' as const,
    resolvedAt: null,
    reporterEmail: 'promeneur@example.com',
  },
  {
    latitude: '45.587900',
    longitude: '-73.719400',
    category: 'dangerous_tree' as const,
    resolvedAt: new Date('2026-08-01T16:45:00Z'),
    reporterEmail: 'voisin@example.com',
  },
  {
    latitude: '45.584700',
    longitude: '-73.733500',
    category: 'damaged_infrastructure' as const,
    resolvedAt: null,
    reporterEmail: 'randonneur@example.com',
  },
  {
    latitude: '45.590200',
    longitude: '-73.728900',
    category: 'unleashed_dog' as const,
    resolvedAt: new Date('2026-07-28T11:15:00Z'),
    reporterEmail: 'gardien@example.com',
  },
] as const

async function seedReports() {
  const existing = await db.select().from(reports)
  if (existing.length > 0) {
    console.log(
      `reports table already has ${existing.length} row(s), skipping seed`,
    )
    process.exit(0)
  }

  const [volunteer] = await db
    .select()
    .from(users)
    .where(eq(users.role, 'volunteer'))
    .limit(1)

  const [pro] = await db
    .select()
    .from(users)
    .where(eq(users.role, 'pro'))
    .limit(1)

  const citizenReports = MOCK_REPORTS.map((report) => ({
    latitude: report.latitude,
    longitude: report.longitude,
    category: report.category,
    resolvedAt: report.resolvedAt,
    reporterEmail: report.reporterEmail,
  }))

  const userReports = []
  if (volunteer) {
    userReports.push({
      latitude: '45.586500',
      longitude: '-73.724300',
      category: 'reptile' as const,
      resolvedAt: null,
      userId: volunteer.id,
    })
  }
  if (pro) {
    userReports.push({
      latitude: '45.588200',
      longitude: '-73.720700',
      category: 'bryophyte' as const,
      resolvedAt: new Date('2026-07-10T08:00:00Z'),
      userId: pro.id,
    })
  }

  await db.insert(reports).values([...citizenReports, ...userReports])

  console.log(
    `Seeded ${citizenReports.length + userReports.length} reports (${userReports.length} linked to users)`,
  )
  process.exit(0)
}

seedReports().catch((err) => {
  console.error(err)
  process.exit(1)
})
