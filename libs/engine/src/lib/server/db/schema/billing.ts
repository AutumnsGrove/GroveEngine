/**
 * Billing Domain Schema — Subscriptions, Webhooks, Comped Invites
 *
 * Payment processing and subscription management tables.
 */

import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { tenants } from "./platform.js";

// ─────────────────────────────────────────────────────────────────────────────
// BILLING: Platform Billing, Webhooks, Comped Invites
// ─────────────────────────────────────────────────────────────────────────────

export const platformBilling = sqliteTable("platform_billing", {
	id: text("id").primaryKey(),
	tenantId: text("tenant_id")
		.notNull()
		.unique()
		.references(() => tenants.id, { onDelete: "cascade" }),
	plan: text("plan", { enum: ["wanderer", "seedling", "sapling", "oak", "evergreen"] })
		.notNull()
		.default("seedling"),
	status: text("status", {
		enum: ["trialing", "active", "past_due", "paused", "canceled", "unpaid"],
	})
		.notNull()
		.default("active"),
	providerCustomerId: text("provider_customer_id"),
	providerSubscriptionId: text("provider_subscription_id"),
	currentPeriodStart: integer("current_period_start"),
	currentPeriodEnd: integer("current_period_end"),
	cancelAtPeriodEnd: integer("cancel_at_period_end").default(0),
	trialEnd: integer("trial_end"),
	paymentMethodLast4: text("payment_method_last4"),
	paymentMethodBrand: text("payment_method_brand"),
	createdAt: integer("created_at")
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer("updated_at")
		.notNull()
		.default(sql`(unixepoch())`),
});

export const webhookEvents = sqliteTable(
	"webhook_events",
	{
		id: text("id").primaryKey(),
		tenantId: text("tenant_id"),
		provider: text("provider").notNull().default("stripe"),
		providerEventId: text("provider_event_id").notNull(),
		eventType: text("event_type").notNull(),
		payload: text("payload").notNull(),
		processed: integer("processed").default(0),
		processedAt: integer("processed_at"),
		error: text("error"),
		retryCount: integer("retry_count").default(0),
		expiresAt: integer("expires_at"),
		createdAt: integer("created_at")
			.notNull()
			.default(sql`(unixepoch())`),
	},
	(table) => [uniqueIndex("idx_webhooks_provider_event").on(table.provider, table.providerEventId)],
);

export const compedInvites = sqliteTable("comped_invites", {
	id: text("id").primaryKey(),
	email: text("email").notNull().unique(),
	tier: text("tier", { enum: ["seedling", "sapling", "oak", "evergreen"] }).notNull(),
	customMessage: text("custom_message"),
	invitedBy: text("invited_by").notNull(),
	createdAt: integer("created_at")
		.notNull()
		.default(sql`(unixepoch())`),
	usedAt: integer("used_at"),
	usedByTenantId: text("used_by_tenant_id").references(() => tenants.id, { onDelete: "set null" }),
});

export const compedInvitesAudit = sqliteTable("comped_invites_audit", {
	id: text("id").primaryKey(),
	action: text("action", { enum: ["create", "revoke", "use"] }).notNull(),
	inviteId: text("invite_id").notNull(),
	email: text("email").notNull(),
	tier: text("tier").notNull(),
	actorEmail: text("actor_email").notNull(),
	notes: text("notes"),
	createdAt: integer("created_at")
		.notNull()
		.default(sql`(unixepoch())`),
});
