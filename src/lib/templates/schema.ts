import { z } from "zod";

/**
 * InvitationFieldsSchema — Zod schema for all invitation template fields.
 *
 * This is the single source of truth for the InvitationFields type.
 * All 6 templates read from this schema. The editor renders form controls from it.
 * The deployed Vercel site reads the same JSON (invitation-config.json).
 *
 * First defined here in 01-06 to unblock git.service.ts import.
 * 01-03 (templates) builds on top of this schema.
 */
export const InvitationFieldsSchema = z.object({
  title: z.string().min(1), // user-set invitation name (first field in editor)
  names: z.string().min(1), // couple names or child name
  eventDatetime: z.string(), // ISO 8601
  venueName: z.string(),
  venueAddress: z.string(),
  coverPhotoUrl: z.string().url().optional(), // Vercel Blob CDN URL
  personalMessage: z.string().max(500).optional(),
  dresscodeRsvpNote: z.string().optional(),
});

export type InvitationFields = z.infer<typeof InvitationFieldsSchema>;
