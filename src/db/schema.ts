import {
  check,
  decimal,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const roleEnum = pgEnum('role', ['volunteer', 'pro', 'admin'])

export const statusEnum = pgEnum('status', ['pending', 'approved', 'rejected'])

export const reportCategoryEnum = pgEnum('report_category', [
  // Entretien (maintenance)
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
  'maintenance_other',
  // Citoyen (respect du règlement)
  'bicycles',
  'motor_vehicle',
  'foraging',
  'off_trail',
  'encroachment',
  'unleashed_dog',
  'dog_waste',
  'campfire',
  'built_shelter',
  'homeless_camp',
  'illegal_dumping',
  'citizen_other',
  // Faune et flore
  'reptile',
  'insecte',
  'oiseau',
  'amphibien',
  'mammifere',
  'invertebre',
  'mollusque',
  'poisson',
  'plante_vasculaire',
  'bryophyte',
  'faune_flore_other',
])

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  authUserId: uuid('auth_user_id').notNull().unique(),
  email: text('email').notNull().unique(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  role: roleEnum('role').notNull().default('volunteer'),
  status: statusEnum('status').notNull().default('pending'),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
}).enableRLS()

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
    description: text('description'),
    typology: text('typology'),
    quantity: integer('quantity'),
    species: text('species'),
    unit: text('unit'),
    habitat: text('habitat'),
    statut: text('statut'),
    photoUrl: text('photo_url'),
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
).enableRLS()

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
    distanceMeters: integer('distance_meters'),
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
).enableRLS()

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
    uniqueIndex('patrol_points_patrol_id_recorded_at_idx').on(
      table.patrolId,
      table.recordedAt,
    ),
  ],
).enableRLS()

export const mapLoadCounters = pgTable('map_load_counters', {
  month: text('month').primaryKey(),
  count: integer('count').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
}).enableRLS()
