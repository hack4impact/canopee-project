DELETE FROM "patrol_points" a USING "patrol_points" b WHERE a."patrol_id" = b."patrol_id" AND a."recorded_at" = b."recorded_at" AND a."id" > b."id";--> statement-breakpoint
DROP INDEX "patrol_points_patrol_id_recorded_at_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "patrol_points_patrol_id_recorded_at_idx" ON "patrol_points" USING btree ("patrol_id","recorded_at");