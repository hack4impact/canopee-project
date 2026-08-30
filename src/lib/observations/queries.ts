import { and, asc, desc, eq, gte, inArray, isNull, or } from 'drizzle-orm'
import { db, reports, users } from '@/db'
import {
  canViewObservations,
  type ObservationViewer,
} from '@/lib/observations/access'
import {
  OBSERVATION_CATEGORIES,
  type Observation,
  type ObservationCategory,
} from '@/lib/observations/collection'
import type { ObservationExportRow } from '@/lib/observations/export'
import {
  resolvedCutoff,
  resolvedDelayHours,
} from '@/lib/observations/visibility'

export async function listObservations(
  viewer: ObservationViewer,
): Promise<Observation[]> {
  if (!canViewObservations(viewer)) {
    console.debug('[observations] Unauthorized access attempt', { viewer })
    return []
  }

  const cutoff = resolvedCutoff(new Date(), resolvedDelayHours())

  const rows = await db
    .select({
      id: reports.id,
      category: reports.category,
      latitude: reports.latitude,
      longitude: reports.longitude,
    })
    .from(reports)
    .where(
      and(
        inArray(reports.category, [...OBSERVATION_CATEGORIES]),
        or(isNull(reports.resolvedAt), gte(reports.resolvedAt, cutoff)),
      ),
    )
    .orderBy(desc(reports.createdAt))

  return rows.map((row) => ({
    id: row.id,
    category: row.category as ObservationCategory,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
  }))
}

export async function listObservationsForExport(
  viewer: ObservationViewer,
): Promise<ObservationExportRow[]> {
  if (!canViewObservations(viewer)) {
    console.debug('[observations] Unauthorized export attempt', { viewer })
    return []
  }

  const rows = await db
    .select({
      eventNumber: reports.eventNumber,
      category: reports.category,
      species: reports.species,
      latitude: reports.latitude,
      longitude: reports.longitude,
      description: reports.description,
      habitat: reports.habitat,
      quantity: reports.quantity,
      unit: reports.unit,
      statut: reports.statut,
      photoUrl: reports.photoUrl,
      createdAt: reports.createdAt,
      observerFirstName: users.firstName,
      observerLastName: users.lastName,
      observerRole: users.role,
      reporterEmail: reports.reporterEmail,
    })
    .from(reports)
    .leftJoin(users, eq(reports.userId, users.id))
    .where(inArray(reports.category, [...OBSERVATION_CATEGORIES]))
    .orderBy(asc(reports.eventNumber))

  return rows.map((row) => ({
    ...row,
    category: row.category as ObservationCategory,
  }))
}
