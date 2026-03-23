/**
 * Friends Service — user-scoped follow relationships.
 *
 * Friends are scoped by user_id so that any logged-in user can follow groves,
 * even if they haven't created their own grove yet. When a user does have a
 * grove, their tenant_id is stored alongside for features like Chirp mutual
 * friends, but it's not required.
 *
 * Lantern, FollowButton, and future social features all consume this service.
 *
 * Types defined here are the source of truth — validated at the API boundary.
 */

import type { Friend } from "$lib/types/friend";
export type { Friend } from "$lib/types/friend";

export interface FriendSearchResult {
	tenantId: string;
	name: string;
	subdomain: string;
}

/**
 * List all friends for a user, ordered by most recently added.
 */
export async function listFriends(db: D1Database, userId: string): Promise<Friend[]> {
	const result = await db
		.prepare(
			`SELECT friend_tenant_id, friend_name, friend_subdomain, source
			 FROM friends
			 WHERE user_id = ?
			 ORDER BY added_at DESC`,
		)
		.bind(userId)
		.all<{
			friend_tenant_id: string;
			friend_name: string;
			friend_subdomain: string;
			source: string;
		}>();

	return (result.results ?? []).map((row) => ({
		tenantId: row.friend_tenant_id,
		name: row.friend_name,
		subdomain: row.friend_subdomain,
		source: row.source,
	}));
}

/**
 * Add a friend by subdomain. Resolves the subdomain to a tenant,
 * validates it's not the caller's own grove, and inserts with
 * INSERT OR IGNORE for graceful duplicate handling.
 *
 * @param userId - The authenticated user's ID
 * @param tenantId - The user's own tenant ID (null if they don't have a grove)
 *
 * Returns the new Friend on success, or an error if the subdomain doesn't exist
 * or the user is trying to follow their own grove.
 */
export async function addFriend(
	db: D1Database,
	userId: string,
	friendSubdomain: string,
	tenantId?: string | null,
): Promise<{ friend: Friend } | { error: "not_found" | "self_add" }> {
	const friendTenant = await db
		.prepare(`SELECT id, subdomain, display_name FROM tenants WHERE subdomain = ?`)
		.bind(friendSubdomain)
		.first<{ id: string; subdomain: string; display_name: string }>();

	if (!friendTenant) {
		return { error: "not_found" };
	}

	// Prevent following your own grove — check if the user owns this tenant
	if (tenantId && friendTenant.id === tenantId) {
		return { error: "self_add" };
	}

	await db
		.prepare(
			`INSERT OR IGNORE INTO friends (user_id, tenant_id, friend_tenant_id, friend_name, friend_subdomain, source)
			 VALUES (?, ?, ?, ?, ?, 'manual')`,
		)
		.bind(
			userId,
			tenantId ?? null,
			friendTenant.id,
			friendTenant.display_name,
			friendTenant.subdomain,
		)
		.run();

	return {
		friend: {
			tenantId: friendTenant.id,
			name: friendTenant.display_name,
			subdomain: friendTenant.subdomain,
			source: "manual",
		},
	};
}

/**
 * Remove a friend connection. Returns true if the connection existed and was removed.
 * Uses a single DELETE and checks meta.changes — avoids a redundant SELECT round-trip.
 */
export async function removeFriend(
	db: D1Database,
	userId: string,
	friendTenantId: string,
): Promise<boolean> {
	const result = await db
		.prepare(`DELETE FROM friends WHERE user_id = ? AND friend_tenant_id = ?`)
		.bind(userId, friendTenantId)
		.run();

	return ((result.meta as Record<string, number>)?.changes ?? 0) > 0;
}

/**
 * Check if a user-to-tenant friend connection exists.
 */
export async function isFriend(
	db: D1Database,
	userId: string,
	friendTenantId: string,
): Promise<boolean> {
	const existing = await db
		.prepare(`SELECT 1 FROM friends WHERE user_id = ? AND friend_tenant_id = ? LIMIT 1`)
		.bind(userId, friendTenantId)
		.first();

	return !!existing;
}

/**
 * Check if two tenants are mutual friends (both follow each other).
 * Required for Chirp DM access — both parties must opt in.
 *
 * Uses tenant_id (not user_id) because mutual friendship inherently
 * requires both parties to have groves. Grove-less users can follow
 * but can't be mutual friends.
 */
export async function areMutualFriends(
	db: D1Database,
	tenantA: string,
	tenantB: string,
): Promise<boolean> {
	const result = await db
		.prepare(
			`SELECT COUNT(*) as cnt FROM friends
			 WHERE (tenant_id = ? AND friend_tenant_id = ?)
			    OR (tenant_id = ? AND friend_tenant_id = ?)`,
		)
		.bind(tenantA, tenantB, tenantB, tenantA)
		.first<{ cnt: number }>();

	return (result?.cnt ?? 0) >= 2;
}

/**
 * Search tenants by subdomain or display name, excluding a given tenant.
 * LIKE wildcards in user input are escaped to prevent injection.
 */
export async function searchTenants(
	db: D1Database,
	query: string,
	excludeTenantId: string,
): Promise<FriendSearchResult[]> {
	const escaped = query.replace(/[%_]/g, "\\$&");
	const pattern = `%${escaped}%`;

	const result = await db
		.prepare(
			`SELECT id, subdomain, display_name
			 FROM tenants
			 WHERE (LOWER(subdomain) LIKE ? ESCAPE '\\' OR LOWER(display_name) LIKE ? ESCAPE '\\')
			   AND id != ?
			   AND active = 1
			 LIMIT 10`,
		)
		.bind(pattern, pattern, excludeTenantId)
		.all<{ id: string; subdomain: string; display_name: string }>();

	return (result.results ?? []).map((row) => ({
		tenantId: row.id,
		name: row.display_name,
		subdomain: row.subdomain,
	}));
}
