/**
 * Profile Settings - Business Logic Service
 *
 * Handles username changes with TenantDO migration,
 * greenhouse data loading, and feature flag mutations.
 */

import {
	getGreenhouseTenant,
	getTenantControllableGrafts,
	getGreenhouseTenants,
	getFeatureFlags,
} from "@autumnsgrove/lattice/platform/feature-flags";
import { queryMany, queryOne } from "@autumnsgrove/lattice/server/services/database";
import type { TenantGraftInfo } from "@autumnsgrove/lattice/platform/feature-flags/tenant-grafts";
import type { GreenhouseTenant } from "@autumnsgrove/lattice/platform/feature-flags/types";
import type { FeatureFlagSummary } from "@autumnsgrove/lattice/platform/feature-flags/admin";
import { isWayfinder } from "@autumnsgrove/lattice/platform/config/wayfinder";
import { isValidTier, type TierKey } from "@autumnsgrove/lattice/platform/config/tiers";
import {
	canChangeUsername,
	getUsernameHistory,
	type UsernameChangeHistoryEntry,
} from "@autumnsgrove/lattice/server/services/username";

// ============================================================================
// Types
// ============================================================================

export interface ProfileLoadData {
	isWayfinder: boolean;
	greenhouseStatus: {
		inGreenhouse: boolean;
		enrolledAt?: Date;
		notes?: string;
	};
	tenantGrafts: TenantGraftInfo[];
	oauthAvatarUrl: string | null;
	currentSubdomain: string;
	tenantPlan: string;
	usernameChangeAllowed: boolean;
	usernameChangeNextAllowedAt: number | undefined;
	usernameChangeReason: string | undefined;
	usernameHistory: UsernameChangeHistoryEntry[];
	greenhouseTenants: GreenhouseTenant[];
	tenantNames: Record<string, string>;
	availableTenants: Record<string, string>;
	featureFlags: FeatureFlagSummary[];
}

interface TenantRow {
	id: string;
	username: string;
	display_name: string | null;
}

// ============================================================================
// Load Profile Data
// ============================================================================

export async function loadProfileData(
	env: { DB: D1Database; CACHE_KV?: KVNamespace },
	tenantId: string,
	userEmail: string | undefined,
	userPicture: string | null,
): Promise<ProfileLoadData> {
	const userIsWayfinder = isWayfinder(userEmail);

	let greenhouseStatus: ProfileLoadData["greenhouseStatus"] = { inGreenhouse: false };
	let tenantGrafts: TenantGraftInfo[] = [];
	let greenhouseTenants: GreenhouseTenant[] = [];
	const tenantNames: Record<string, string> = {};
	const availableTenants: Record<string, string> = {};
	let featureFlags: FeatureFlagSummary[] = [];
	let currentSubdomain = "";
	let tenantPlan = "seedling";
	let usernameChangeAllowed = false;
	let usernameChangeNextAllowedAt: number | undefined;
	let usernameChangeReason: string | undefined;
	let usernameHistory: UsernameChangeHistoryEntry[] = [];

	const loadGreenhouse = async () => {
		if (!env.CACHE_KV) return;
		try {
			const tenant = await getGreenhouseTenant(tenantId, {
				DB: env.DB,
				FLAGS_KV: env.CACHE_KV,
			});

			if (tenant && tenant.enabled) {
				greenhouseStatus = {
					inGreenhouse: true,
					enrolledAt: tenant.enrolledAt,
					notes: tenant.notes,
				};

				tenantGrafts = await getTenantControllableGrafts(tenantId, {
					DB: env.DB,
					FLAGS_KV: env.CACHE_KV,
				});
			}

			if (userIsWayfinder) {
				const flagsEnv = { DB: env.DB, FLAGS_KV: env.CACHE_KV };

				const [ghTenants, flags] = await Promise.all([
					getGreenhouseTenants(flagsEnv),
					getFeatureFlags(flagsEnv),
				]);

				greenhouseTenants = ghTenants;
				featureFlags = flags;

				const enrolledIds = new Set(ghTenants.map((t) => t.tenantId));

				try {
					const tenantRows = await queryMany<TenantRow>(
						env.DB,
						"SELECT id, username, display_name FROM tenants ORDER BY username",
					);

					for (const t of tenantRows) {
						const displayName = t.display_name || t.username || t.id;
						tenantNames[t.id] = displayName;

						if (!enrolledIds.has(t.id)) {
							availableTenants[t.id] = displayName;
						}
					}
				} catch (error) {
					console.error("Failed to load tenants for Wayfinder:", error);
				}
			}
		} catch (error) {
			console.error("Failed to check greenhouse status:", error);
		}
	};

	const loadUsername = async () => {
		try {
			const tenantRow = await queryOne<{ subdomain: string; plan: string | null }>(
				env.DB,
				"SELECT subdomain, plan FROM tenants WHERE id = ?",
				[tenantId],
			);

			if (tenantRow) {
				currentSubdomain = tenantRow.subdomain;
				tenantPlan = tenantRow.plan || "seedling";
			}

			const tier: TierKey = isValidTier(tenantPlan) ? (tenantPlan as TierKey) : "seedling";
			const [rateResult, history] = await Promise.all([
				canChangeUsername(env.DB, tenantId, tier),
				getUsernameHistory(env.DB, tenantId),
			]);
			usernameChangeAllowed = rateResult.allowed;
			usernameChangeNextAllowedAt = rateResult.nextAllowedAt;
			usernameChangeReason = rateResult.reason;
			usernameHistory = history;
		} catch (error) {
			console.error("Failed to load username change data:", error);
		}
	};

	await Promise.all([loadGreenhouse(), loadUsername()]);

	return {
		isWayfinder: userIsWayfinder,
		greenhouseStatus,
		tenantGrafts,
		oauthAvatarUrl: userPicture ?? null,
		currentSubdomain,
		tenantPlan,
		usernameChangeAllowed,
		usernameChangeNextAllowedAt,
		usernameChangeReason,
		usernameHistory,
		greenhouseTenants,
		tenantNames,
		availableTenants,
		featureFlags,
	};
}

// ============================================================================
// TenantDO Draft Migration (after username change)
// ============================================================================

export async function migrateTenantDODrafts(
	tenantsDO: DurableObjectNamespace,
	currentSubdomain: string,
	newUsername: string,
): Promise<void> {
	// Migrate drafts from old TenantDO to new TenantDO (best-effort)
	try {
		const oldDoId = tenantsDO.idFromName(`tenant:${currentSubdomain}`);
		const oldStub = tenantsDO.get(oldDoId);
		const draftsResponse = await oldStub.fetch("https://tenant.internal/drafts");

		if (draftsResponse.ok) {
			const drafts = (await draftsResponse.json()) as Array<{
				slug: string;
				metadata: Record<string, unknown>;
				lastSaved: number;
				deviceId: string;
			}>;

			const draftsToMigrate = drafts.slice(0, 20);

			if (draftsToMigrate.length > 0) {
				const newDoId = tenantsDO.idFromName(`tenant:${newUsername}`);
				const newStub = tenantsDO.get(newDoId);

				for (let i = 0; i < draftsToMigrate.length; i += 5) {
					const batch = draftsToMigrate.slice(i, i + 5);
					await Promise.all(
						batch.map(async (draft) => {
							const fullDraftRes = await oldStub.fetch(
								`https://tenant.internal/drafts/${encodeURIComponent(draft.slug)}`,
							);
							if (fullDraftRes.ok) {
								const fullDraft = await fullDraftRes.json();
								await newStub.fetch(
									`https://tenant.internal/drafts/${encodeURIComponent(draft.slug)}`,
									{
										method: "PUT",
										headers: { "Content-Type": "application/json" },
										body: JSON.stringify(fullDraft),
									},
								);
							}
						}),
					);
				}
			}
		}
	} catch (draftErr) {
		console.warn("[Username] Draft migration failed (non-blocking):", draftErr);
	}

	// Push config to new TenantDO so first request is warm
	try {
		const newDoId = tenantsDO.idFromName(`tenant:${newUsername}`);
		const newStub = tenantsDO.get(newDoId);
		await newStub.fetch("https://tenant.internal/config", {
			method: "PUT",
			headers: {
				"X-Tenant-Subdomain": newUsername,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				subdomain: newUsername,
			}),
		});
	} catch (cacheErr) {
		console.warn("[Username] TenantDO cache push failed (non-blocking):", cacheErr);
	}
}
