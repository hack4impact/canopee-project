import 'dotenv/config'
import { sql as raw } from 'drizzle-orm'
import { db, reports } from './index'
import type { ReportCategory } from '../lib/reports/categories'

const REGION = {
  south: 45.35,
  north: 45.75,
  west: -74.05,
  east: -73.4,
}

const SEED_EMAIL_DOMAIN = 'seed.canopee.test'

type Site = {
  name: string
  latitude: number
  longitude: number
  spreadDegrees: number
  open: number
  resolved: number
}

const SITES: Site[] = [
  {
    name: 'Bois Papineau',
    latitude: 45.5875,
    longitude: -73.723,
    spreadDegrees: 0.0035,
    open: 12,
    resolved: 2,
  },
  {
    name: "Bois de l'Équerre",
    latitude: 45.61,
    longitude: -73.775,
    spreadDegrees: 0.003,
    open: 8,
    resolved: 1,
  },
  {
    name: 'Boisé de Chomedey',
    latitude: 45.548,
    longitude: -73.78,
    spreadDegrees: 0.0028,
    open: 7,
    resolved: 0,
  },
  {
    name: 'Bois Duvernay',
    latitude: 45.618,
    longitude: -73.665,
    spreadDegrees: 0.0025,
    open: 6,
    resolved: 1,
  },
  {
    name: 'Centre de la nature',
    latitude: 45.564,
    longitude: -73.686,
    spreadDegrees: 0.002,
    open: 5,
    resolved: 0,
  },
  {
    name: 'Berges de la rivière',
    latitude: 45.6,
    longitude: -73.6,
    spreadDegrees: 0.02,
    open: 8,
    resolved: 0,
  },
]

const PIN_CATEGORIES: ReportCategory[] = [
  'dangerous_tree',
  'fallen_tree',
  'littering',
  'blocked_trail',
  'damaged_trail',
  'unofficial_trail',
  'bridge_repair',
  'damaged_infrastructure',
  'signage_fix',
  'site_maintenance',
  'bicycles',
  'motor_vehicle',
  'off_trail',
  'unleashed_dog',
  'dog_waste',
  'campfire',
  'illegal_dumping',
]

function mulberry32(seed: number): () => number {
  let a = seed

  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const random = mulberry32(20260823)

function jitter(value: number, spread: number): number {
  return value + (random() * 2 - 1) * spread
}

function coordinate(value: number): string {
  return value.toFixed(6)
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

async function main() {
  const previousSeeds = await db
    .delete(reports)
    .where(raw`${reports.reporterEmail} like ${'%@' + SEED_EMAIL_DOMAIN}`)
    .returning({ id: reports.id })

  console.log(`Removed ${previousSeeds.length} rows from a previous reseed`)

  const outOfRegion = await db
    .delete(reports)
    .where(
      raw`${reports.latitude} not between ${REGION.south} and ${REGION.north}
        or ${reports.longitude} not between ${REGION.west} and ${REGION.east}`,
    )
    .returning({ id: reports.id })

  console.log(
    `Removed ${outOfRegion.length} rows outside Montréal/Laval (${REGION.south}..${REGION.north}, ${REGION.west}..${REGION.east})`,
  )

  const rows: (typeof reports.$inferInsert)[] = []
  let index = 0

  for (const site of SITES) {
    for (let n = 0; n < site.open + site.resolved; n += 1) {
      const isResolved = n >= site.open
      index += 1

      rows.push({
        latitude: coordinate(jitter(site.latitude, site.spreadDegrees)),
        longitude: coordinate(jitter(site.longitude, site.spreadDegrees)),
        category:
          PIN_CATEGORIES[Math.floor(random() * PIN_CATEGORIES.length)] ??
          'littering',
        description: `${site.name} — signalement de démonstration`,
        resolvedAt: isResolved ? daysAgo(Math.floor(random() * 30) + 1) : null,
        createdAt: daysAgo(Math.floor(random() * 90) + 1),
        reporterEmail: `pin-seed-${index}@${SEED_EMAIL_DOMAIN}`,
      })
    }
  }

  await db.insert(reports).values(rows)

  const open = rows.filter((row) => row.resolvedAt === null).length

  console.log(
    `Seeded ${rows.length} reports across ${SITES.length} sites (${open} open, ${rows.length - open} resolved)`,
  )

  process.exit(0)
}

main().catch((cause) => {
  console.error(cause)
  process.exit(1)
})
