CREATE TYPE "public"."role" AS ENUM('volunteer', 'pro', 'admin');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "role" DEFAULT 'volunteer' NOT NULL,
	"status" "status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_auth_user_id_unique" UNIQUE("auth_user_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
