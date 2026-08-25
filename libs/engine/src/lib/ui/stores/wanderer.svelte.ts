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

/**
 * True on localhost/127.0.0.1 — local dev has no DNS entry for seeded
 * subdomains, so cross-grove links there must route through ?subdomain=
 * instead of a real https://<sub>.grove.place hostname. See buildGroveHref.
 */
function isLocalDev(): boolean {
	return browser && (location.hostname === "localhost" || location.hostname === "127.0.0.1");
}

/**
 * Build a URL to a specific grove's subdomain — a real
 * `https://<sub>.grove.place<path>` in production, or a local
 * `<path>?subdomain=<sub>` URL when running locally.
 *
 * Shared by every cross-grove link in Lantern (home link, friend cards,
 * getArborHref below) so local dev and production only differ here.
 */
export function buildGroveHref(subdomain: string, path = "/"): string {
	if (isLocalDev()) {
		const separator = path.includes("?") ? "&" : "?";
		return `${path}${separator}subdomain=${subdomain}`;
	}
	return `https://${subdomain}.grove.place${path === "/" ? "" : path}`;
}

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

/**
 * Compute the correct arbor (admin panel) URL for the current user.
 *
 * When a logged-in Wanderer is viewing someone else's grove, a relative
 * `/arbor` link would send them into the wrong grove's admin panel —
 * they'd land on the grove owner's Arbor and (rightly) get rejected or,
 * worse, see unfamiliar tenant data. This helper returns an absolute URL
 * back to the user's own home grove in that case, and the short form
 * when they're already on their own grove.
 *
 * Pure function so it works from both server-rendered code and client
 * reactive code. Both +layout.svelte (for the header user menu) and
 * LanternPanel.svelte (for the settings cog + Admin service link) share
 * this single rule.
 *
 * @param homeGrove  The user's own subdomain (from lanternData.homeGrove)
 * @param currentGrove The subdomain of the grove currently being viewed
 * @returns "/arbor" when at home or when we can't determine, or
 *          buildGroveHref(homeGrove, "/arbor") when visiting elsewhere
 */
export function getArborHref(
	homeGrove: string | null | undefined,
	currentGrove: string | null | undefined,
): string {
	if (homeGrove && currentGrove && homeGrove !== currentGrove) {
		return buildGroveHref(homeGrove, "/arbor");
	}
	return "/arbor";
}
