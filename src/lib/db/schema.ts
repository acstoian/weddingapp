import {
  pgTable,
  pgEnum,
  text,
  uuid,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

// InvitationFields is the locked JSON contract shared by all templates.
// Defined in lib/templates/schema.ts and imported here (01-03).
import type { InvitationFields } from "@/lib/templates/schema";
export type { InvitationFields };

export const invitationStatusEnum = pgEnum("invitation_status", [
  "DRAFT",
  "PUBLISHING",
  "LIVE",
  "FAILED",
]);

/**
 * users — mirrors Clerk user; stores app-level user preferences.
 * Primary key is the Clerk user ID (text, not UUID).
 * Phase 2 adds: stripeCustomerId for returning customer reuse.
 */
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user ID
  email: text("email").notNull(),
  tier: text("tier").notNull().default("FREE"), // FREE | GOLD | PLATINUM
  lang: text("lang").notNull().default("ro"), // RO | EN preference
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * invitations — one row per invitation; status drives the state machine.
 * fields jsonb stores template-specific field values (typed via InvitationFields).
 */
export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(), // Clerk user ID
  templateId: text("template_id").notNull(),
  title: text("title").notNull().default(""),
  fields: jsonb("fields").notNull().$type<InvitationFields>(),
  status: invitationStatusEnum("status").notNull().default("DRAFT"),
  vercelProjectId: text("vercel_project_id"),
  vercelDeployId: text("vercel_deploy_id"),
  liveUrl: text("live_url"),
  lastPublishedAt: timestamp("last_published_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * stripeEvents — idempotency log for incoming Stripe webhook events.
 * Unique constraint on stripeEventId prevents duplicate processing.
 * Phase 2: replaces the subscriptions table.
 */
export const stripeEvents = pgTable("stripe_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  stripeEventId: text("stripe_event_id").notNull().unique(),
  eventType: text("event_type").notNull(),
  userId: text("user_id"),
  processedAt: timestamp("processed_at").notNull().defaultNow(),
});
