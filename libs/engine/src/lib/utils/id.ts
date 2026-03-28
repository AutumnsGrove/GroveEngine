/**
 * ID generation utilities.
 *
 * SSOT for UUID generation. Uses the Web Crypto API which is available
 * in browsers, Cloudflare Workers, and Node 19+.
 */

/**
 * Generate a UUID v4 identifier.
 */
export function generateId(): string {
	return crypto.randomUUID();
}
