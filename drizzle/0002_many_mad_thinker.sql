CREATE TYPE "public"."report_category" AS ENUM('dangerous_tree', 'damaged_infrastructure', 'fauna_observation', 'flora_observation', 'unleashed_dog');--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_number" integer GENERATED ALWAYS AS IDENTITY (sequence name "reports_event_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"latitude" numeric(9, 6) NOT NULL,
	"longitude" numeric(9, 6) NOT NULL,
	"category" "report_category" NOT NULL,
	"resolved_at" timestamp with time zone,
	"user_id" uuid,
	"reporter_email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reports_event_number_unique" UNIQUE("event_number"),
	CONSTRAINT "reports_reporter_present" CHECK (("reports"."user_id" is null) <> ("reports"."reporter_email" is null))
);
--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reports_resolved_at_idx" ON "reports" USING btree ("resolved_at");--> statement-breakpoint
CREATE INDEX "reports_category_idx" ON "reports" USING btree ("category");