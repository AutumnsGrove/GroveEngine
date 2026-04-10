/**
 * Wanderer Store — Who am I, and where am I?
 *
 * Tracks the logged-in user's home grove and the grove they're
 * currently browsing. Provides simple derived comparisons:
 *
 *   wandererStore.isHome     → you're on your own grove
 *   wandererStore.isVisiting → you're on someone else's grove
 *
 * Used by:
 * - Lantern: hide self-follow prompt (#1524)
 * - Accent colors: show grove owner's theme, not visitor's (#1512)
 * - Any feature that behaves differently home vs visiting
 *
 * homeGrove is persisted to localStorage so it's available
 * immediately on page load before server hydration completes.
 * currentGrove is derived from the tenant context on each page load.
 */

import { browser } from "$app/environment";

const STORAGE_KEY = "grove-wanderer-home";

/** The subdomain of the user's own grove (e.g., "autumn") */
let homeGrove = $state<string>(getStoredHome());

/** The subdomain of the grove currently being viewed (e.g., "a2a0") */
let currentGrove = $state<string>("");

function getStoredHome(): string {
	if (!browser) return "";
	try {
		return localStorage.getItem(STORAGE_KEY) || "";
	} catch {
		return "";
	}
}

export const wandererStore = {
	/** The subdomain of the user's own grove */
	get homeGrove() {
		return homeGrove;
	},

	/** The subdomain of the grove currently being viewed */
	get currentGrove() {
		return currentGrove;
	},

	/** True when the user is viewing their own grove */
	get isHome() {
		return !!homeGrove && homeGrove === currentGrove;
	},

	/** True when the user is on a grove that isn't theirs */
	get isVisiting() {
		return !!homeGrove && !!currentGrove && homeGrove !== currentGrove;
	},

	/**
	 * Hydrate from layout server data. Called once on mount
	 * from +layout.svelte with the user's home subdomain and
	 * the current tenant's subdomain.
	 */
	hydrate(home: string, current: string) {
		if (home) {
			homeGrove = home;
			if (browser) {
				try {
					localStorage.setItem(STORAGE_KEY, home);
				} catch {
					// localStorage unavailable
				}
			}
		}
		currentGrove = current;
	},

	/** Clear on logout */
	clear() {
		homeGrove = "";
		currentGrove = "";
		if (browser) {
			try {
				localStorage.removeItem(STORAGE_KEY);
			} catch {
				// localStorage unavailable
			}
		}
	},
};
