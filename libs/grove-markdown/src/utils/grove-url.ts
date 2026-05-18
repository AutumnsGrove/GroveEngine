/**
 * Grove URL Builder
 *
 * Centralized utility for building Grove subdomain URLs.
 */

export const GROVE_DOMAIN = "grove.place";

/**
 * Build a full URL to a user's grove.
 */
export function buildGroveUrl(username: string, path?: string): string {
	const base = `https://${username}.${GROVE_DOMAIN}`;

	if (!path) {
		return base;
	}

	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	return `${base}${normalizedPath}`;
}

/**
 * Build the admin URL for a user's grove.
 */
export function buildGroveAdminUrl(username: string): string {
	return buildGroveUrl(username, "/arbor");
}

/**
 * Extract the username from a grove URL.
 */
export function parseGroveUrl(url: string): string | null {
	try {
		const parsed = new URL(url);
		const hostname = parsed.hostname;

		if (!hostname.endsWith(`.${GROVE_DOMAIN}`)) {
			return null;
		}

		const subdomain = hostname.slice(0, -(GROVE_DOMAIN.length + 1));

		if (!subdomain || subdomain.includes(".")) {
			return null;
		}

		return subdomain;
	} catch {
		return null;
	}
}

/**
 * Check if a URL is a grove subdomain URL.
 */
export function isGroveUrl(url: string): boolean {
	return parseGroveUrl(url) !== null;
}

/**
 * Sanitize a returnTo/redirect URL to prevent open redirect attacks.
 */
export function sanitizeReturnTo(returnTo: string | null | undefined, fallback = "/"): string {
	if (!returnTo || typeof returnTo !== "string") {
		return fallback;
	}

	if (!returnTo.startsWith("/")) {
		return fallback;
	}

	if (returnTo.startsWith("//") || returnTo.startsWith("/\\")) {
		return fallback;
	}

	return returnTo;
}
