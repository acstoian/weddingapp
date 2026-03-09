CREATE TYPE "public"."invitation_status" AS ENUM('DRAFT', 'PUBLISHING', 'LIVE', 'FAILED');--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"template_id" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"fields" jsonb NOT NULL,
	"status" "invitation_status" DEFAULT 'DRAFT' NOT NULL,
	"vercel_project_id" text,
	"vercel_deploy_id" text,
	"live_url" text,
	"last_published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"stripe_customer_id" text,
	"stripe_sub_id" text,
	"tier" text DEFAULT 'FREE' NOT NULL,
	"current_period_end" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"tier" text DEFAULT 'FREE' NOT NULL,
	"lang" text DEFAULT 'ro' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;