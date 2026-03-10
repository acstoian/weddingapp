-- Phase 2 Billing Infrastructure Migration
-- Drops the subscriptions table (replaced by stripe_events + users.stripe_customer_id)
-- Adds stripe_customer_id to users for returning customer reuse
-- Creates stripe_events table for idempotent webhook processing

ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "subscriptions_user_id_users_id_fk";
DROP TABLE IF EXISTS "subscriptions";
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "stripe_customer_id" text;
CREATE TABLE IF NOT EXISTS "stripe_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "stripe_event_id" text NOT NULL,
  "event_type" text NOT NULL,
  "user_id" text,
  "processed_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "stripe_events_stripe_event_id_unique" UNIQUE("stripe_event_id")
);
