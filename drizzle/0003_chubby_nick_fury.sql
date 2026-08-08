CREATE TABLE "patrol_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patrol_id" uuid NOT NULL,
	"latitude" numeric(9, 6) NOT NULL,
	"longitude" numeric(9, 6) NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patrols" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "patrol_points" ADD CONSTRAINT "patrol_points_patrol_id_patrols_id_fk" FOREIGN KEY ("patrol_id") REFERENCES "public"."patrols"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patrols" ADD CONSTRAINT "patrols_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "patrol_points_patrol_id_recorded_at_idx" ON "patrol_points" USING btree ("patrol_id","recorded_at");--> statement-breakpoint
CREATE INDEX "patrols_user_id_started_at_idx" ON "patrols" USING btree ("user_id","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "patrols_started_at_idx" ON "patrols" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "patrols_ended_at_idx" ON "patrols" USING btree ("ended_at");