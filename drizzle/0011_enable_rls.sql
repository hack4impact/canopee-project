ALTER TABLE "map_load_counters" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "patrol_points" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "patrols" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON "users", "reports", "patrols", "patrol_points", "map_load_counters" FROM anon, authenticated;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "public" REVOKE ALL ON TABLES FROM anon, authenticated;
