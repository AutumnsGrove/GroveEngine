/**
 * Subscriptions Service — email notification subscriptions.
 *
 * Independent from the friends system. A wanderer subscribes to a grove
 * to receive email digests when new posts are published.
 *
 * Tokens are generated for one-click, no-login unsubscribe (RFC 8058).
 */

/** Maximum age (in seconds) for unsubscribe tokens. 30 days. */
const TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

/**
 * Validate an IANA timezone string.
 * Returns the timezone if valid, null otherwise.
 */
function validateTimezone(tz: string): string | null {
	try {
		Intl.DateTimeFormat("en-US", { timeZone: tz });
		return tz;
	} catch {
		return null;
	}
}

export interface Subscription {
	id: string;
	userId: string;
	targetTenantId: string;
	email: string;
	preferredHour: number;
	timezone: string;
	createdAt: number;
}

export interface SubscriptionWithGrove extends Subscription {
	groveName: string;
	groveSubdomain: string;
}

export interface SubscriberInfo {
	subscriptionId: string;
	userId: string;
	email: string;
	preferredHour: number;
	timezone: string;
}

/**
 * Subscribe a user to a grove's email notifications.
 * INSERT OR IGNORE — safe to call multiple times.
 */
export async function subscribe(
	db: D1Database,
	userId: string,
	email: string,
	targetTenantId: string,
	timezone?: string,
): Promise<{ created: boolean }> {
	const id = crypto.randomUUID();
	const tz = (timezone && validateTimezone(timezone)) ?? "America/New_York";

	const result = await db
		.prepare(
			`INSERT OR IGNORE INTO subscriptions (id, user_id, target_tenant_id, email, timezone)
			 VALUES (?, ?, ?, ?, ?)`,
		)
		.bind(id, userId, targetTenantId, email, tz)
		.run();

	return { created: ((result.meta as Record<string, number>)?.changes ?? 0) > 0 };
}

/**
 * Unsubscribe a user from a grove (authenticated).
 */
export async function unsubscribe(
	db: D1Database,
	userId: string,
	targetTenantId: string,
): Promise<boolean> {
	const result = await db
		.prepare(`DELETE FROM subscriptions WHERE user_id = ? AND target_tenant_id = ?`)
		.bind(userId, targetTenantId)
		.run();

	return ((result.meta as Record<string, number>)?.changes ?? 0) > 0;
}

/**
 * Read-only lookup of an unsubscribe token.
 * Returns grove info if valid and not expired, null otherwise.
 * Used by the GET handler to show a confirmation page without mutating.
 */
export async function lookupUnsubscribeToken(
	db: D1Database,
	token: string,
): Promise<{ groveName: string } | null> {
	const row = await db
		.prepare(
			`SELECT ut.created_at as token_created, t.display_name as grove_name
			 FROM subscription_unsubscribe_tokens ut
			 JOIN subscriptions s ON s.id = ut.subscription_id
			 LEFT JOIN tenants t ON t.id = s.target_tenant_id
			 WHERE ut.token = ?`,
		)
		.bind(token)
		.first<{ token_created: number; grove_name: string }>();

	if (!row) return null;

	// Check TTL — reject expired tokens
	const age = Math.floor(Date.now() / 1000) - row.token_created;
	if (age > TOKEN_TTL_SECONDS) return null;

	return { groveName: row.grove_name ?? "this grove" };
}

/**
 * Unsubscribe via a token (no login required).
 * Deletes the subscription and all associated tokens.
 * Checks TTL before proceeding.
 */
export async function unsubscribeByToken(
	db: D1Database,
	token: string,
): Promise<{ success: boolean; groveName?: string }> {
	const row = await db
		.prepare(
			`SELECT s.id, ut.created_at as token_created, t.display_name as grove_name
			 FROM subscription_unsubscribe_tokens ut
			 JOIN subscriptions s ON s.id = ut.subscription_id
			 LEFT JOIN tenants t ON t.id = s.target_tenant_id
			 WHERE ut.token = ?`,
		)
		.bind(token)
		.first<{ id: string; token_created: number; grove_name: string }>();

	if (!row) return { success: false };

	// Check TTL — reject expired tokens
	const age = Math.floor(Date.now() / 1000) - row.token_created;
	if (age > TOKEN_TTL_SECONDS) return { success: false };

	await db.prepare(`DELETE FROM subscriptions WHERE id = ?`).bind(row.id).run();

	return { success: true, groveName: row.grove_name };
}

/**
 * Check if a user is subscribed to a grove.
 */
export async function isSubscribed(
	db: D1Database,
	userId: string,
	targetTenantId: string,
): Promise<boolean> {
	const existing = await db
		.prepare(`SELECT 1 FROM subscriptions WHERE user_id = ? AND target_tenant_id = ? LIMIT 1`)
		.bind(userId, targetTenantId)
		.first();

	return !!existing;
}

/**
 * Get all subscribers for a tenant (for sending notifications).
 */
export async function getSubscribersForTenant(
	db: D1Database,
	targetTenantId: string,
): Promise<SubscriberInfo[]> {
	const result = await db
		.prepare(
			`SELECT id, user_id, email, preferred_hour, timezone
			 FROM subscriptions
			 WHERE target_tenant_id = ?`,
		)
		.bind(targetTenantId)
		.all<{
			id: string;
			user_id: string;
			email: string;
			preferred_hour: number;
			timezone: string;
		}>();

	return (result.results ?? []).map((row) => ({
		subscriptionId: row.id,
		userId: row.user_id,
		email: row.email,
		preferredHour: row.preferred_hour,
		timezone: row.timezone,
	}));
}

/**
 * Get all subscriptions for a user (for managing preferences).
 */
export async function getUserSubscriptions(
	db: D1Database,
	userId: string,
): Promise<SubscriptionWithGrove[]> {
	const result = await db
		.prepare(
			`SELECT s.id, s.user_id, s.target_tenant_id, s.email,
			        s.preferred_hour, s.timezone, s.created_at,
			        t.display_name as grove_name, t.subdomain as grove_subdomain
			 FROM subscriptions s
			 LEFT JOIN tenants t ON t.id = s.target_tenant_id
			 WHERE s.user_id = ?
			 ORDER BY s.created_at DESC`,
		)
		.bind(userId)
		.all<{
			id: string;
			user_id: string;
			target_tenant_id: string;
			email: string;
			preferred_hour: number;
			timezone: string;
			created_at: number;
			grove_name: string;
			grove_subdomain: string;
		}>();

	return (result.results ?? []).map((row) => ({
		id: row.id,
		userId: row.user_id,
		targetTenantId: row.target_tenant_id,
		email: row.email,
		preferredHour: row.preferred_hour,
		timezone: row.timezone,
		createdAt: row.created_at,
		groveName: row.grove_name,
		groveSubdomain: row.grove_subdomain,
	}));
}

/**
 * Update subscription preferences (timezone, preferred hour).
 */
export async function updatePreferences(
	db: D1Database,
	userId: string,
	targetTenantId: string,
	prefs: { preferredHour?: number; timezone?: string },
): Promise<boolean> {
	const sets: string[] = [];
	const values: (string | number)[] = [];

	if (prefs.preferredHour !== undefined) {
		if (prefs.preferredHour < 0 || prefs.preferredHour > 23) return false;
		sets.push("preferred_hour = ?");
		values.push(prefs.preferredHour);
	}

	if (prefs.timezone !== undefined) {
		const validTz = validateTimezone(prefs.timezone);
		if (!validTz) return false;
		sets.push("timezone = ?");
		values.push(validTz);
	}

	if (sets.length === 0) return false;

	values.push(userId, targetTenantId);

	const result = await db
		.prepare(
			`UPDATE subscriptions SET ${sets.join(", ")} WHERE user_id = ? AND target_tenant_id = ?`,
		)
		.bind(...values)
		.run();

	return ((result.meta as Record<string, number>)?.changes ?? 0) > 0;
}

/**
 * Generate a one-time unsubscribe token for a subscription.
 * Reuses existing token if one already exists.
 */
export async function getOrCreateUnsubscribeToken(
	db: D1Database,
	subscriptionId: string,
): Promise<string> {
	const existing = await db
		.prepare(`SELECT token FROM subscription_unsubscribe_tokens WHERE subscription_id = ? LIMIT 1`)
		.bind(subscriptionId)
		.first<{ token: string }>();

	if (existing) return existing.token;

	const token = crypto.randomUUID();
	const id = crypto.randomUUID();

	await db
		.prepare(
			`INSERT INTO subscription_unsubscribe_tokens (id, subscription_id, token) VALUES (?, ?, ?)`,
		)
		.bind(id, subscriptionId, token)
		.run();

	return token;
}
