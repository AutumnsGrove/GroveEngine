/**
 * Comped Invites - Validation Schemas
 *
 * Zod schemas for all comped invite form actions.
 */

import { z } from "zod";

// Valid tiers for comped accounts
export const VALID_TIERS = ["seedling", "sapling", "oak", "evergreen"] as const;
export type CompedTier = (typeof VALID_TIERS)[number];

// Invite types that exist in the database. "beta" is legacy — it came from the
// retired waitlist→beta-tester promotion flow. New invites are always "comped",
// but the value is kept here so the admin list can filter/display old rows.
export const VALID_INVITE_TYPES = ["comped", "beta"] as const;
export type InviteType = (typeof VALID_INVITE_TYPES)[number];

// Basic email format check — real validation happens at send time via Zephyr
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const CreateInviteSchema = z.object({
	email: z.string().toLowerCase().trim().min(1, "Please enter a valid email address"),
	tier: z.enum(["seedling", "sapling", "oak", "evergreen"], {
		error: "Please select a valid tier",
	}),
	custom_message: z.string().trim().optional().default(""),
	notes: z.string().trim().optional().default(""),
});

export const InviteIdSchema = z.object({
	invite_id: z.string().min(1, "Invite ID is required"),
	notes: z.string().trim().optional().default(""),
});
