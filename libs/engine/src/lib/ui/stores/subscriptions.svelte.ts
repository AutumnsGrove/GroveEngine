/**
 * Subscriptions store — client-side state for email notification subscriptions.
 *
 * Independent of the friends store. Tracks which groves the current user
 * has subscribed to for email notifications.
 *
 * Follows the friends.svelte.ts pattern: module-level $state variables,
 * exported as a plain object with getters and methods.
 */

import { api } from "$lib/utils/api";

let subscribed = $state<Set<string>>(new Set());
let loading = $state<Set<string>>(new Set());

export const subscriptionsStore = {
	isSubscribed(tenantId: string): boolean {
		return subscribed.has(tenantId);
	},

	isLoading(tenantId: string): boolean {
		return loading.has(tenantId);
	},

	/** Mark a tenant as subscribed (from server-side load). */
	setSubscribed(tenantId: string, value: boolean) {
		if (value) {
			subscribed = new Set([...subscribed, tenantId]);
		} else {
			subscribed = new Set([...subscribed].filter((id) => id !== tenantId));
		}
	},

	async subscribe(tenantId: string): Promise<boolean> {
		if (loading.has(tenantId)) return false;
		loading = new Set([...loading, tenantId]);

		try {
			const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
			await api.post(`/api/subscriptions/${tenantId}`, { timezone: tz });
			subscribed = new Set([...subscribed, tenantId]);
			return true;
		} catch {
			return false;
		} finally {
			loading = new Set([...loading].filter((id) => id !== tenantId));
		}
	},

	async unsubscribe(tenantId: string): Promise<boolean> {
		if (loading.has(tenantId)) return false;
		loading = new Set([...loading, tenantId]);

		try {
			await api.delete(`/api/subscriptions/${tenantId}`);
			subscribed = new Set([...subscribed].filter((id) => id !== tenantId));
			return true;
		} catch {
			return false;
		} finally {
			loading = new Set([...loading].filter((id) => id !== tenantId));
		}
	},

	async checkAndCache(tenantId: string): Promise<boolean> {
		try {
			const result = await api.get<{ subscribed: boolean }>(`/api/subscriptions/${tenantId}`);
			if (result) {
				this.setSubscribed(tenantId, result.subscribed);
				return result.subscribed;
			}
			return false;
		} catch {
			return false;
		}
	},
};
