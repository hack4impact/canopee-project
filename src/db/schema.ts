import {
  check,
  decimal,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const roleEnum = pgEnum('role', ['volunteer', 'pro', 'admin'])

export const statusEnum = pgEnum('status', ['pending', 'approved', 'rejected'])

export const reportCategoryEnum = pgEnum('report_category', [
  'dangerous_tree',
  'damaged_infrastructure',
  'fauna_observation',
  'flora_observation',
  'unleashed_dog',
])

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  authUserId: uuid('auth_user_id').notNull().unique(),
  email: text('email').notNull().unique(),
  role: roleEnum('role').notNull().default('volunteer'),
  status: statusEnum('status').notNull().default('pending'),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const reports = pgTable(
  'reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventNumber: integer('event_number')
      .notNull()
      .unique()
      .generatedAlwaysAsIdentity(),
    latitude: decimal('latitude', { precision: 9, scale: 6 }).notNull(),
    longitude: decimal('longitude', { precision: 9, scale: 6 }).notNull(),
    category: reportCategoryEnum('category').notNull(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    userId: uuid('user_id').references(() => users.id),
    reporterEmail: text('reporter_email'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      'reports_reporter_present',
      sql`(${table.userId} is null) <> (${table.reporterEmail} is null)`,
    ),
    index('reports_resolved_at_idx').on(table.resolvedAt),
    index('reports_category_idx').on(table.category),
  ],
)

export const patrols = pgTable(
  'patrols',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    startedAt: timestamp('started_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('patrols_user_id_started_at_idx').on(
      table.userId,
      table.startedAt.desc(),
    ),
    index('patrols_started_at_idx').on(table.startedAt),
    index('patrols_ended_at_idx').on(table.endedAt),
  ],
)

export const patrolPoints = pgTable(
  'patrol_points',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    patrolId: uuid('patrol_id')
      .notNull()
      .references(() => patrols.id, { onDelete: 'cascade' }),
    latitude: decimal('latitude', { precision: 9, scale: 6 }).notNull(),
    longitude: decimal('longitude', { precision: 9, scale: 6 }).notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('patrol_points_patrol_id_recorded_at_idx').on(
      table.patrolId,
      table.recordedAt,
    ),
  ],
)

/** Tracks self-reported Mapbox map loads per calendar month (UTC), used to
 * approximate usage against the 50,000 free-tier threshold since Mapbox
 * does not expose a usage-statistics API. */
export const mapLoadCounters = pgTable('map_load_counters', {
  month: text('month').primaryKey(), // 'YYYY-MM', UTC
  count: integer('count').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})
