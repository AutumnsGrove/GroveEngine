/**
 * Auth Domain Schema — Users, Sessions, Onboarding, Verification
 *
 * Covers identity, authentication, and user lifecycle tables.
 */

import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { tenants } from "./platform.js";

// ─────────────────────────────────────────────────────────────────────────────
// CORE: Users
// ─────────────────────────────────────────────────────────────────────────────

export const users = sqliteTable("users", {
	id: text("id").primaryKey(),
	groveauthId: text("groveauth_id").unique().notNull(),
	email: text("email").notNull(),
	displayName: text("display_name"),
	avatarUrl: text("avatar_url"),
	tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "set null" }),
	lastLoginAt: integer("last_login_at"),
	loginCount: integer("login_count").default(0),
	isActive: integer("is_active").default(1),
	createdAt: integer("created_at").default(sql`(unixepoch())`),
	updatedAt: integer("updated_at").default(sql`(unixepoch())`),
});

// ─────────────────────────────────────────────────────────────────────────────
// CORE: Sessions
// ─────────────────────────────────────────────────────────────────────────────

export const sessions = sqliteTable("sessions", {
	id: text("id").primaryKey(),
	tenantId: text("tenant_id")
		.notNull()
		.references(() => tenants.id, { onDelete: "cascade" }),
	userEmail: text("user_email").notNull(),
	expiresAt: integer("expires_at").notNull(),
	createdAt: integer("created_at")
		.notNull()
		.default(sql`(unixepoch())`),
});

// ─────────────────────────────────────────────────────────────────────────────
// CORE: User Onboarding
// ─────────────────────────────────────────────────────────────────────────────

export const userOnboarding = sqliteTable("user_onboarding", {
	id: text("id").primaryKey(),
	groveauthId: text("groveauth_id").unique().notNull(),
	email: text("email").notNull(),

	// Profile data
	displayName: text("display_name"),
	username: text("username").unique(),
	favoriteColor: text("favorite_color"),
	interests: text("interests").default("[]"),

	// Progress tracking
	authCompletedAt: integer("auth_completed_at"),
	profileCompletedAt: integer("profile_completed_at"),
	planSelected: text("plan_selected"),
	planBillingCycle: text("plan_billing_cycle"),
	planSelectedAt: integer("plan_selected_at"),
	paymentCompletedAt: integer("payment_completed_at"),
	tenantCreatedAt: integer("tenant_created_at"),
	tourStartedAt: integer("tour_started_at"),
	tourCompletedAt: integer("tour_completed_at"),
	tourSkipped: integer("tour_skipped").default(0),

	// Billing (actively written by billing webhook)
	stripeCustomerId: text("stripe_customer_id"),
	stripeSubscriptionId: text("stripe_subscription_id"),

	// Email preferences
	checkinEmailsUnsubscribed: integer("checkin_emails_unsubscribed").default(0),

	// Email verification (028)
	emailVerified: integer("email_verified").default(0),
	emailVerifiedAt: integer("email_verified_at"),
	emailVerifiedVia: text("email_verified_via"),

	// Tenant link
	tenantId: text("tenant_id"),

	createdAt: integer("created_at").default(sql`(unixepoch())`),
	updatedAt: integer("updated_at").default(sql`(unixepoch())`),
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTH: Rate Limits, Failed Attempts
// (magic_codes table still exists in prod DB — schema kept for migration compat)
// ─────────────────────────────────────────────────────────────────────────────

/** @deprecated Magic code auth removed in Great Grove Refactor Phase 2. Table retained for migration compat. */
export const magicCodes = sqliteTable("magic_codes", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	email: text("email").notNull(),
	code: text("code").notNull(),
	createdAt: integer("created_at").notNull(),
	expiresAt: integer("expires_at").notNull(),
	used: integer("used").default(0),
});

export const rateLimits = sqliteTable("rate_limits", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	ipAddress: text("ip_address").notNull(),
	createdAt: integer("created_at").notNull(),
});

export const failedAttempts = sqliteTable("failed_attempts", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	email: text("email").notNull().unique(),
	attempts: integer("attempts").default(0),
	lastAttempt: integer("last_attempt").notNull(),
	lockedUntil: integer("locked_until"),
});

export const emailVerifications = sqliteTable("email_verifications", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => userOnboarding.id, { onDelete: "cascade" }),
	email: text("email").notNull(),
	code: text("code").notNull(),
	createdAt: integer("created_at").default(sql`(unixepoch())`),
	expiresAt: integer("expires_at").notNull(),
	verifiedAt: integer("verified_at"),
	attempts: integer("attempts").default(0),
});

export const reservedUsernames = sqliteTable("reserved_usernames", {
	username: text("username").primaryKey(),
	reason: text("reason").notNull(),
	createdAt: integer("created_at").default(sql`(unixepoch())`),
});

export const usernameAuditLog = sqliteTable("username_audit_log", {
	id: text("id").primaryKey(),
	action: text("action").notNull(),
	username: text("username").notNull(),
	reason: text("reason"),
	actorEmail: text("actor_email").notNull(),
	actorId: text("actor_id"),
	notes: text("notes"),
	createdAt: integer("created_at").default(sql`(unixepoch())`),
});

export const usernameHistory = sqliteTable("username_history", {
	id: text("id").primaryKey(),
	tenantId: text("tenant_id")
		.notNull()
		.references(() => tenants.id, { onDelete: "cascade" }),
	oldSubdomain: text("old_subdomain").notNull(),
	newSubdomain: text("new_subdomain").notNull(),
	changedAt: integer("changed_at")
		.notNull()
		.default(sql`(unixepoch())`),
	holdExpiresAt: integer("hold_expires_at").notNull(),
	released: integer("released").default(0),
	actorEmail: text("actor_email").notNull(),
});
